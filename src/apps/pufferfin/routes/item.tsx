import type { BaseItemPerson } from '@jellyfin/sdk/lib/generated-client/models/base-item-person';
import { PersonKind } from '@jellyfin/sdk/lib/generated-client/models/person-kind';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import Movie from '@mui/icons-material/Movie';
import PlayArrow from '@mui/icons-material/PlayArrow';
import React, { type FC, useCallback, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import { useItem } from 'hooks/useItem';
import type { ItemDto } from 'types/base/models/item-dto';
import { ItemKind } from 'types/base/models/item-kind';

import Hero from '../components/Hero';
import MediaRow from '../components/MediaRow';
import PersonCard from '../components/PersonCard';
import PosterCard from '../components/PosterCard';
import RoundButton from '../components/RoundButton';
import ChoicePicker from '../components/ChoicePicker';
import { useEpisodes, useSeasons, useSeriesNextUp, useSimilarItems } from '../features/details/api/useDetails';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { getBackdropUrl, getCardImageUrl, getPersonImageUrl } from '../utils/images';
import { getDisplayTitle, getEpisodeNumbers, getPlayedPercentage, getRuntime, isResumable } from '../utils/items';
import { useOpenItem, useOpenPerson } from '../utils/navigation';
import { playItem as play, playTrailers } from '../utils/playback';

const CAST_LIMIT = 24;
const GENRE_LIMIT = 3;

const getKey = (item: { Id?: string | null }) => item.Id ?? '';
const getCastKey = (person: BaseItemPerson) => `${person.Id ?? ''}-${person.Role ?? ''}`;

// Play is rendered before a series knows its next episode: it is then disabled and has nothing to play
const playIfAny = (target: ItemDto | undefined) => {
    if (target) play(target);
};

const ItemDetails: FC<{ itemId: string }> = ({ itemId }) => {
    const t = useTranslation();
    const { api } = useApi();
    const openItem = useOpenItem();
    const openPerson = useOpenPerson();
    const pageRef = useRef<HTMLDivElement>(null);

    const { data: item, isPending, isError } = useItem(itemId);
    const seriesId = item?.Type === ItemKind.Series ? item.Id ?? undefined : undefined;

    const seasons = useSeasons(seriesId);
    const nextUp = useSeriesNextUp(seriesId);
    const similar = useSimilarItems(item?.Id ?? undefined);

    // The season shown first is the one of the next episode to watch
    const [ chosenSeasonId, setChosenSeasonId ] = useState<string>();
    const defaultSeasonId = nextUp.isPending ? undefined : nextUp.data?.SeasonId ?? seasons.data?.[0]?.Id ?? undefined;
    const seasonId = chosenSeasonId ?? defaultSeasonId;
    const episodes = useEpisodes(seriesId, seasonId);

    // For a series, Play waits for the next episode: focusing before would land on a later button
    const isPlayReady = !seriesId || !nextUp.isPending;
    useInitialFocus(pageRef, [ item, isPlayReady ], !!item && isPlayReady);

    const formatEpisode = useCallback((episode: ItemDto) => {
        const numbers = getEpisodeNumbers(episode);
        return numbers ? t('EpisodeNumber', numbers[0], numbers[1]) : undefined;
    }, [ t ]);

    // A series plays its next episode; without one, the whole series from the start
    const playTarget = seriesId && nextUp.data ? nextUp.data : item;
    const playLabel = useMemo(() => {
        if (!playTarget) return t('ActionPlay');
        const numbers = playTarget !== item ? getEpisodeNumbers(playTarget) : undefined;
        if (numbers) {
            return isResumable(playTarget) ?
                t('ActionResumeEpisode', numbers[0], numbers[1]) :
                t('ActionPlayEpisode', numbers[0], numbers[1]);
        }
        return isResumable(playTarget) ? t('ActionResume') : t('ActionPlay');
    }, [ item, playTarget, t ]);

    const meta = useMemo(() => {
        if (!item) return [];
        const runtime = item.Type === ItemKind.Movie ? getRuntime(item.RunTimeTicks) : undefined;
        let runtimeText: string | undefined;
        if (runtime) {
            runtimeText = runtime.hours ?
                t('DurationHoursMinutes', runtime.hours, runtime.minutes) :
                t('DurationMinutes', runtime.minutes);
        }
        return [
            item.ProductionYear ? String(item.ProductionYear) : undefined,
            runtimeText,
            item.OfficialRating ?? undefined,
            item.Genres?.slice(0, GENRE_LIMIT).join(', ')
        ]
            .filter((value): value is string => !!value)
            // Unique values: a rating equal to the year would otherwise repeat and collide as keys
            .filter((value, index, values) => values.indexOf(value) === index);
    }, [ item, t ]);

    const cast = useMemo(
        () => (item?.People ?? []).filter(person => person.Type === PersonKind.Actor).slice(0, CAST_LIMIT),
        [ item ]
    );

    const renderEpisode = useCallback((episode: ItemDto) => {
        const progress = getPlayedPercentage(episode);
        return (
            <PosterCard
                title={episode.Name ?? ''}
                subtitle={formatEpisode(episode)}
                imageUrl={api ? getCardImageUrl(api, episode, 'landscape') : undefined}
                shape='landscape'
                progress={progress}
                progressLabel={progress ? t('WatchedPercent', progress) : undefined}
                value={episode}
                onSelect={play}
            />
        );
    }, [ api, formatEpisode, t ]);

    const renderPerson = useCallback((person: BaseItemPerson) => (
        <PersonCard
            name={person.Name ?? ''}
            role={person.Role}
            imageUrl={api ? getPersonImageUrl(api, person) : undefined}
            value={person.Id}
            onSelect={openPerson}
        />
    ), [ api, openPerson ]);

    const renderSimilar = useCallback((similarItem: ItemDto) => (
        <PosterCard
            title={getDisplayTitle(similarItem)}
            imageUrl={api ? getCardImageUrl(api, similarItem, 'portrait') : undefined}
            shape='portrait'
            value={similarItem}
            onSelect={openItem}
        />
    ), [ api, openItem ]);

    if (isPending) {
        return (
            <div className='pf-status' aria-busy='true'>
                <p>{t('Loading')}</p>
            </div>
        );
    }

    if (isError || !item) {
        // Failure is told with an icon and words, never with color alone
        return (
            <div className='pf-status' role='status'>
                <ErrorOutline aria-hidden='true' />
                <p>{t('ItemLoadError')}</p>
            </div>
        );
    }

    const hasTrailer = !!item.LocalTrailerCount || !!item.RemoteTrailers?.length;

    return (
        <div ref={pageRef} className='pf-details'>
            <Hero
                title={getDisplayTitle(item)}
                meta={meta.length > 0 && (
                    <ul className='pf-meta'>
                        {meta.map(value => <li key={value} className='pf-meta__item'>{value}</li>)}
                    </ul>
                )}
                overview={item.Overview}
                backdropUrl={api ? getBackdropUrl(api, item) : undefined}
                actions={
                    <>
                        <RoundButton
                            variant='primary'
                            icon={<PlayArrow />}
                            label={playLabel}
                            disabled={!playTarget || (!!seriesId && nextUp.isPending)}
                            value={playTarget}
                            onClick={playIfAny}
                        />
                        {hasTrailer && (
                            <RoundButton
                                icon={<Movie />}
                                label={t('ActionTrailer')}
                                value={item}
                                onClick={playTrailers}
                            />
                        )}
                    </>
                }
            />

            <div className='pf-details__sections'>
                {seriesId && seasons.data && seasons.data.length > 0 && (
                    <section className='pf-details__episodes' aria-label={t('SeasonsLabel')}>
                        <ChoicePicker
                            label={t('SeasonsLabel')}
                            options={seasons.data.map(season => ({ id: season.Id ?? '', name: season.Name ?? '' }))}
                            selectedId={seasonId}
                            onSelect={setChosenSeasonId}
                        />
                        <MediaRow
                            title={seasons.data.find(season => season.Id === seasonId)?.Name ?? ''}
                            shape='landscape'
                            items={episodes.data}
                            isPending={!seasonId || episodes.isPending}
                            isError={episodes.isError}
                            getKey={getKey}
                            renderItem={renderEpisode}
                        />
                    </section>
                )}

                <MediaRow
                    title={t('RowCast')}
                    shape='portrait'
                    items={cast}
                    isPending={false}
                    isError={false}
                    getKey={getCastKey}
                    renderItem={renderPerson}
                />

                <MediaRow
                    title={t('RowMoreLikeThis')}
                    shape='portrait'
                    items={similar.data}
                    isPending={similar.isPending}
                    isError={similar.isError}
                    getKey={getKey}
                    renderItem={renderSimilar}
                />

                {(item.Overview || !!item.Studios?.length) && (
                    // Focusable as a whole: it holds no control, and the remote must still reach it
                    <section
                        className='pf-about'
                        aria-labelledby='pf-about-title'
                        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- remote users must reach a section that holds only text
                        tabIndex={0}
                        {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                    >
                        <h2 id='pf-about-title' className='pf-row__title pf-about__title'>{t('SectionAbout')}</h2>
                        <div className='pf-about__body'>
                            {item.Overview && <p className='pf-about__overview'>{item.Overview}</p>}
                            <dl className='pf-about__facts'>
                                {!!item.Genres?.length && (
                                    <>
                                        <dt>{t('LabelGenres')}</dt>
                                        <dd>{item.Genres.join(', ')}</dd>
                                    </>
                                )}
                                {!!item.Studios?.length && (
                                    <>
                                        <dt>{t('LabelStudios')}</dt>
                                        <dd>{item.Studios.map(studio => studio.Name).filter(Boolean).join(', ')}</dd>
                                    </>
                                )}
                            </dl>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export const Component = () => {
    const { itemId } = useParams();
    // Keyed by id: opening a similar title starts from a clean page state
    return itemId ? <ItemDetails key={itemId} itemId={itemId} /> : null;
};

Component.displayName = 'PufferfinItemPage';
