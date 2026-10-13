import type { BaseItemPerson } from '@jellyfin/sdk/lib/generated-client/models/base-item-person';
import { PersonKind } from '@jellyfin/sdk/lib/generated-client/models/person-kind';
import React, { type FC, useCallback, useMemo, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import { useItem } from 'hooks/useItem';
import type { ItemDto } from 'types/base/models/item-dto';
import { ItemKind } from 'types/base/models/item-kind';

import Hero from '../components/Hero';
import MediaRow from '../components/MediaRow';
import PersonCard from '../components/PersonCard';
import PosterCard from '../components/PosterCard';
import RoundButton from '../components/RoundButton';
import { useTogglePlayed } from '../features/details/api/usePlayed';
import ResumeButton, { type ResumeCard } from '../features/details/components/ResumeButton';
import { CheckIcon, TrailerIcon } from '../features/details/components/sheetIcons';
import { formatClock, getRemainingMinutes, getVersionTags, splitMinutes } from '../features/details/utils/sheet';
import ChoicePicker from '../components/ChoicePicker';
import { useEpisodes, useSeasons, useSeriesNextUp, useSimilarItems } from '../features/details/api/useDetails';
import { useCanRequest } from '../features/requests/api/useCanRequest';
import { useMergedSeasons } from '../features/series/api/useMergedSeasons';
import SeasonDownloads from '../features/series/components/SeasonDownloads';
import SeriesEpisodes from '../features/series/components/SeriesEpisodes';
import { CatalogItemKind } from '../features/catalog/api/types';
import { useCatalogCast } from '../features/details/api/useCatalogCast';
import CatalogCastRow from '../features/details/components/CatalogCastRow';
import type { Bookmark } from '../features/bookmarks/bookmarks';
import BookmarkButton from '../features/bookmarks/BookmarkButton';
import ReviewLink from '../features/reviews/ReviewLink';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { getBackdropUrl, getCardImageUrl, getPersonImageUrl } from '../utils/images';
import { getDisplayTitle, getEpisodeNumbers, getPlayedPercentage, getRuntime, isResumable } from '../utils/items';
import { useOpenItem, useOpenPerson } from '../utils/navigation';
import { isPlayableItem, playItem as play, playTrailers } from '../utils/playback';
import { getItemPath, getPersonPath } from './paths';
import { DetailsSkeleton } from '../components/Skeleton';
import { usePlayItem } from '../utils/usePlay';
import { ErrorOutline } from '../components/icons';
import { type CreditLink, HeroFacts } from '../components/CreditLine';

import '../features/details/details.scss';

const CAST_LIMIT = 24;
const GENRE_LIMIT = 3;

type Translate = ReturnType<typeof useTranslation>;

const getKey = (item: { Id?: string | null }) => item.Id ?? '';

/** "1 h 11 min", "21 min". */
const formatMinutes = (total: number, t: Translate) => {
    const { hours, minutes } = splitMinutes(total);
    return hours ? t('DurationHoursMinutes', hours, minutes) : t('DurationMinutes', minutes);
};

interface ResumeView {
    label: string
    ariaLabel?: string
    card?: ResumeCard
}

const withAriaLabel = (label: string, card?: ResumeCard): ResumeView => ({
    label,
    ariaLabel: card ? [ label, card.title, card.detail ].filter(Boolean).join(', ') : undefined,
    card
});

/** A series plays its next episode, and opens on it: its numbers, title, and what is left of it. */
function getEpisodeResume(target: ItemDto, numbers: [ number, number ], imageUrl: string | undefined, t: Translate): ResumeView {
    const resumable = isResumable(target);
    const remaining = getRemainingMinutes(target.RunTimeTicks, resumable ? target.UserData?.PlaybackPositionTicks : 0);
    const length = remaining ? formatMinutes(remaining, t) : undefined;
    return withAriaLabel(
        resumable ? t('ActionResumeEpisode', numbers[0], numbers[1]) : t('ActionPlayEpisode', numbers[0], numbers[1]),
        {
            imageUrl,
            progress: resumable ? getPlayedPercentage(target) : undefined,
            kicker: t('EpisodeKicker', numbers[0], numbers[1]),
            title: target.Name ?? '',
            detail: length && resumable ? t('TimeLeft', length) : length
        }
    );
}

/** A film started resumes at its time, and opens on its progress. */
function getTitleResume(target: ItemDto, imageUrl: string | undefined, t: Translate): ResumeView {
    const position = target.UserData?.PlaybackPositionTicks ?? 0;
    const remaining = getRemainingMinutes(target.RunTimeTicks, position);
    const kind = target.Type === ItemKind.Movie ? t('KindMovie') : undefined;
    return withAriaLabel(t('ActionResumeAt', formatClock(position)), {
        imageUrl,
        progress: getPlayedPercentage(target),
        kicker: [ kind, target.ProductionYear ].filter(Boolean).join(' · '),
        title: getDisplayTitle(target),
        detail: remaining ? t('TimeLeft', formatMinutes(remaining, t)) : undefined
    });
}

/**
 * The main button of a sheet: what it says, and the card it opens into. A film
 * started resumes at its time; a series plays its next episode; anything else
 * just plays, and stays a pill.
 */
function getResumeView(item: ItemDto, target: ItemDto | undefined, imageUrl: string | undefined, t: Translate): ResumeView {
    const numbers = target && target !== item ? getEpisodeNumbers(target) : undefined;
    if (target && numbers) return getEpisodeResume(target, numbers, imageUrl, t);
    if (target && isResumable(target) && target.Type !== ItemKind.Series) return getTitleResume(target, imageUrl, t);
    return { label: t('ActionWatch') };
}

/** What a film holds, readable before playing: resolution, sound, languages. */
const getSheetTags = (item: ItemDto | undefined, t: Translate) => (item?.Type === ItemKind.Movie ?
    getVersionTags(item.MediaSources, { stereo: t('TagStereo'), subtitles: codes => t('TagSubtitles', codes) }) :
    []);

/** "Mark as watched", then "Watched" with a firmer check: pressing again takes it back. */
const WatchedButton: FC<{ item: ItemDto }> = ({ item }) => {
    const t = useTranslation();
    const { isPlayed, toggle } = useTogglePlayed(item);
    return (
        <RoundButton
            icon={<CheckIcon strokeWidth={isPlayed ? 2.5 : 1.75} />}
            label={isPlayed ? t('StateWatched') : t('ActionMarkPlayed')}
            pressed={isPlayed}
            onClick={toggle}
        />
    );
};

const getCastKey = (person: BaseItemPerson) => `${person.Id ?? ''}-${person.Role ?? ''}`;

// Play is rendered before a series knows its next episode: it is then disabled and has nothing to play
const playIfAny = (target: ItemDto | undefined) => {
    if (target) void play(target);
};

/**
 * Sheet of a title on disk: Play or Resume, cast, seasons and episodes merged
 * with TMDB. It is the body of the one title sheet when the title is on disk.
 */
export const ItemDetails: FC<{ itemId: string }> = ({ itemId }) => {
    const t = useTranslation();
    const { api } = useApi();
    const openItem = useOpenItem();
    const playCard = usePlayItem();
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

    // With a TMDB id, the episodes come merged with TMDB: the missing ones show and can be downloaded one by one
    const { tmdbId, seasons: mergedSeasons, showLibrarySeasons } = useMergedSeasons(seriesId, item?.ProviderIds?.Tmdb);
    const { canRequest: canRequestEpisodes } = useCanRequest('Sonarr');

    // For a series, Play waits for the next episode: focusing before would land on a later button
    const isPlayReady = !seriesId || !nextUp.isPending;
    useInitialFocus(pageRef, [ item, isPlayReady ], !!item && isPlayReady);

    const formatEpisode = useCallback((episode: ItemDto) => {
        const numbers = getEpisodeNumbers(episode);
        return numbers ? t('EpisodeNumber', numbers[0], numbers[1]) : undefined;
    }, [ t ]);

    // A series plays its next episode; without one, the whole series from the start
    const playTarget = seriesId && nextUp.data ? nextUp.data : item;
    const resume = useMemo(() => {
        if (!item) return { label: t('ActionWatch') };
        const imageUrl = api && playTarget ? getCardImageUrl(api, playTarget, 'landscape') : undefined;
        return getResumeView(item, playTarget, imageUrl, t);
    }, [ api, item, playTarget, t ]);

    const versionTags = useMemo(() => getSheetTags(item, t), [ item, t ]);

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

    // A film or a series known to TMDB can be bookmarked, like the same title in the catalog
    const bookmark = useMemo<Bookmark | undefined>(() => {
        const bookmarkTmdbId = Number(item?.ProviderIds?.Tmdb);
        if (!item || !bookmarkTmdbId) return undefined;
        let kind: CatalogItemKind.Movie | CatalogItemKind.Series | undefined;
        if (item.Type === ItemKind.Movie) kind = CatalogItemKind.Movie;
        else if (item.Type === ItemKind.Series) kind = CatalogItemKind.Series;
        if (!kind) return undefined;
        return {
            kind,
            tmdbId: bookmarkTmdbId,
            title: getDisplayTitle(item),
            year: item.ProductionYear,
            posterUrl: api ? getCardImageUrl(api, item, 'portrait') : undefined
        };
    }, [ api, item ]);

    const cast = useMemo(
        () => (item?.People ?? []).filter(person => person.Type === PersonKind.Actor).slice(0, CAST_LIMIT),
        [ item ]
    );
    // A title the library holds no actors for borrows the cast TMDB knows, when it has an id there
    const catalogCast = useCatalogCast(item, cast.length > 0);
    // The directors, each opening their page with all their films
    const directors = useMemo<CreditLink[]>(
        () => (item?.People ?? [])
            .filter(person => person.Type === PersonKind.Director && !!person.Id)
            .map(person => ({ key: person.Id!, name: person.Name ?? '', path: getPersonPath(person.Id!) })),
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
            onPlay={isPlayableItem(similarItem) ? playCard : undefined}
        />
    ), [ api, openItem, playCard ]);

    if (isPending) return <DetailsSkeleton />;

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
    const isMovie = item.Type === ItemKind.Movie;
    const movieTmdbId = isMovie ? item.ProviderIds?.Tmdb : undefined;

    return (
        <div ref={pageRef} className='pf-details'>
            <Hero
                variant='sheet'
                title={getDisplayTitle(item)}
                meta={<HeroFacts meta={meta} label={t('DirectedBy')} people={directors} />}
                overview={item.Overview}
                tags={versionTags}
                tagsLabel={t('VersionsLabel')}
                backdropUrl={api ? getBackdropUrl(api, item) : undefined}
                actions={
                    <>
                        <ResumeButton
                            label={resume.label}
                            ariaLabel={resume.ariaLabel}
                            card={resume.card}
                            disabled={!playTarget || (!!seriesId && nextUp.isPending)}
                            value={playTarget}
                            onClick={playIfAny}
                        />
                        {canRequestEpisodes && tmdbId && mergedSeasons && (
                            <SeasonDownloads
                                seriesTmdbId={tmdbId}
                                seriesTitle={getDisplayTitle(item)}
                                seasons={mergedSeasons}
                                canRequest={canRequestEpisodes}
                                withDownloadIcon
                            />
                        )}
                        {hasTrailer && (
                            <RoundButton
                                icon={<TrailerIcon />}
                                label={t('ActionTrailer')}
                                value={item}
                                onClick={playTrailers}
                            />
                        )}
                        {isMovie && <WatchedButton item={item} />}
                        {bookmark && <BookmarkButton bookmark={bookmark} withLabel />}
                        {(isMovie || item.Type === ItemKind.Series) && (
                            <ReviewLink
                                title={getDisplayTitle(item)}
                                year={item.ProductionYear}
                                isMovie={isMovie}
                                tmdbId={movieTmdbId}
                            />
                        )}
                    </>
                }
            />

            <div className='pf-details__sections'>
                {tmdbId && mergedSeasons ? (
                    <SeriesEpisodes
                        seriesTmdbId={tmdbId}
                        seasons={mergedSeasons}
                        seriesItemId={seriesId}
                        nextUpSeasonItemId={nextUp.data?.SeasonId}
                        currentEpisodeItemId={nextUp.data?.Id}
                        canRequest={canRequestEpisodes}
                    />
                ) : null}

                {showLibrarySeasons && seasons.data && seasons.data.length > 0 && (
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

                {catalogCast.isNeeded ? (
                    <CatalogCastRow cast={catalogCast.cast} isPending={catalogCast.isPending} />
                ) : (
                    <MediaRow
                        title={t('RowCast')}
                        shape='portrait'
                        items={cast}
                        isPending={false}
                        isError={false}
                        getKey={getCastKey}
                        renderItem={renderPerson}
                    />
                )}

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

/** Former address of the sheet of a title on disk: it moves to the one title sheet, without a step in the history. */
export const Component = () => {
    const { itemId } = useParams();
    return itemId ? <Navigate to={getItemPath(itemId)} replace /> : null;
};

Component.displayName = 'PufferfinLegacyItemRedirect';
