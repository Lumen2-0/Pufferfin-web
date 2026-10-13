import { isAxiosError } from 'axios';
import React, { type FC, useCallback, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useApi } from 'hooks/useApi';

import ChoicePicker from '../../../components/ChoicePicker';
import { CardBone } from '../../../components/Skeleton';
import { useTranslation } from '../../../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE, FOCUSABLE_ATTRIBUTE, focusElement } from '../../../navigation/focus';
import { getDownloadsPath } from '../../../routes/paths';
import { playItem, playItemById } from '../../../utils/playback';
import type { CatalogEpisode, CatalogSeason } from '../../catalog/api/types';
import { useSeasonEpisodes } from '../../catalog/api/useCatalog';
import { useEpisodes } from '../../details/api/useDetails';
import { getEpisodeWindow } from '../../details/utils/sheet';
import { RequestKind, RequestState } from '../../requests/api/types';
import { useCreateRequest, useMyRequests } from '../../requests/api/useRequests';
import { isRequestStale } from '../../requests/utils/requests';
import { getCreateErrorLabel } from '../../requests/utils/status';
import { useNow } from '../../requests/utils/useNow';
import { findEpisodeRequest, getDefaultSeasonNumber, getEpisodeKey } from '../utils/episodes';
import EpisodeCard, { type EpisodeAction, useLibraryImageUrl } from './EpisodeCard';
import { ErrorOutline } from '../../../components/icons';
import DownloadFileLink from '../../fileDownload/DownloadFileLink';

interface SeriesEpisodesProps {
    seriesTmdbId: number
    /** The seasons from `useSeriesSeasons`, TMDB merged with the library. */
    seasons: CatalogSeason[]
    /** Library item of the series, when it is on disk: its episodes bring their images and watch progress. */
    seriesItemId?: string
    /** Library season holding the next episode to watch, shown first. */
    nextUpSeasonItemId?: string | null
    /** Library item of the next episode to watch: outlined, and the episodes around it show first. */
    currentEpisodeItemId?: string | null
    /** Sonarr is enabled and the account may request: otherwise missing episodes offer no download. */
    canRequest: boolean
}

/**
 * Seasons and episodes of a series, TMDB merged with the disk by the server:
 * each episode appears once. An episode on disk plays; a missing one carries
 * a Download badge and is requested on its own when selected; once requested
 * its card tells where the request stands and opens the downloads panel.
 */
const SKELETON_COUNT = 8;

const SeriesEpisodes: FC<SeriesEpisodesProps> = ({ seriesTmdbId, seasons, seriesItemId, nextUpSeasonItemId, currentEpisodeItemId, canRequest }) => {
    const t = useTranslation();
    const headingId = useId();
    const gridRef = useRef<HTMLUListElement>(null);
    const { api, user } = useApi();
    const navigate = useNavigate();

    const [ chosenSeason, setChosenSeason ] = useState<number>();
    const seasonNumber = chosenSeason ?? getDefaultSeasonNumber(seasons, nextUpSeasonItemId);
    const season = seasons.find(item => item.SeasonNumber === seasonNumber);
    const onSeasonSelect = useCallback((id: string) => setChosenSeason(Number(id)), []);
    const seasonOptions = useMemo(() => seasons.map(item => ({
        id: String(item.SeasonNumber),
        name: item.Name || t('SeasonNumber', item.SeasonNumber)
    })), [ seasons, t ]);

    const details = useSeasonEpisodes(seriesTmdbId, seasonNumber);
    // The library episodes of the season bring their own images and watch progress
    const libraryEpisodes = useEpisodes(seriesItemId, season?.LocalItemId ?? undefined);
    const libraryById = useMemo(
        () => new Map((libraryEpisodes.data ?? []).map(item => [ item.Id ?? '', item ])),
        [ libraryEpisodes.data ]
    );

    const requests = useMyRequests();
    const isDownloading = !!requests.data?.some(item => item.State === RequestState.Downloading);
    const now = useNow(isDownloading);
    const isStale = isRequestStale(requests.dataUpdatedAt, now);

    const { mutate: create, isPending: isCreating, isError: isCreateError, error: createError } = useCreateRequest();
    const requestEpisode = useCallback((episode: CatalogEpisode) => {
        // Not disabled while sending: a disabled card would drop the focus
        if (isCreating || episode.EpisodeNumber == null) return;
        create({
            Kind: RequestKind.Episode,
            TmdbId: seriesTmdbId,
            SeasonNumber: episode.SeasonNumber,
            EpisodeNumber: episode.EpisodeNumber,
            // Lets the server match the episode in Sonarr when its numbering differs from TMDB
            AirDate: episode.AirDate ?? undefined
        });
    }, [ create, isCreating, seriesTmdbId ]);

    const playEpisode = useCallback((episode: CatalogEpisode) => {
        const libraryItem = episode.LocalItemId ? libraryById.get(episode.LocalItemId) : undefined;
        if (libraryItem) {
            void playItem(libraryItem);
        } else if (api && user?.Id && episode.LocalItemId) {
            void playItemById(api, user.Id, episode.LocalItemId);
        }
    }, [ api, libraryById, user?.Id ]);

    const onEpisodeSelect = useCallback((episode: CatalogEpisode, action: EpisodeAction) => {
        if (action === 'play') playEpisode(episode);
        else if (action === 'request') requestEpisode(episode);
        else navigate(getDownloadsPath());
    }, [ navigate, playEpisode, requestEpisode ]);
    const getLibraryImageUrl = useLibraryImageUrl();

    // A long season shows the episodes around the one to watch, then all of them on demand
    const [ expandedSeason, setExpandedSeason ] = useState<number>();
    const episodes = details.data?.Episodes;
    const currentIndex = useMemo(
        () => (episodes ?? []).findIndex(episode => !!currentEpisodeItemId && episode.LocalItemId === currentEpisodeItemId),
        [ currentEpisodeItemId, episodes ]
    );
    const isExpanded = expandedSeason === seasonNumber;
    const range = getEpisodeWindow(episodes?.length ?? 0, currentIndex);
    const shown = isExpanded ? episodes : episodes?.slice(range.start, range.end);
    const isCut = !isExpanded && !!episodes && shown?.length !== episodes.length;

    const showAll = useCallback(() => {
        setExpandedSeason(seasonNumber);
        // The button goes away: the focus moves to the first episode that was hidden after the window
        requestAnimationFrame(() => {
            const items = gridRef.current?.querySelectorAll<HTMLElement>(`[${FOCUSABLE_ATTRIBUTE}]`);
            const target = items?.[range.end] ?? items?.[0];
            if (target) focusElement(target);
        });
    }, [ range.end, seasonNumber ]);

    // Watched episodes of the season, when it is on disk
    const watchedCount = useMemo(() => {
        if (!seriesItemId || !episodes?.length || !libraryEpisodes.data) return undefined;
        return episodes.filter(episode => !!episode.LocalItemId && !!libraryById.get(episode.LocalItemId)?.UserData?.Played).length;
    }, [ episodes, libraryById, libraryEpisodes.data, seriesItemId ]);

    const renderEpisode = useCallback((episode: CatalogEpisode) => {
        const libraryItem = episode.LocalItemId ? libraryById.get(episode.LocalItemId) : undefined;
        return (
            <>
                <EpisodeCard
                    isCurrent={!!currentEpisodeItemId && episode.LocalItemId === currentEpisodeItemId}
                    episode={episode}
                    libraryItem={libraryItem}
                    request={findEpisodeRequest(requests.data, seriesTmdbId, episode)}
                    isStale={isStale}
                    canRequest={canRequest}
                    onSelect={onEpisodeSelect}
                    getLibraryImageUrl={getLibraryImageUrl}
                />
                {/* Beside the card, never inside it: a link cannot sit in the button of the card */}
                {libraryItem && <DownloadFileLink item={libraryItem} compact />}
            </>
        );
    }, [ canRequest, currentEpisodeItemId, getLibraryImageUrl, isStale, libraryById, onEpisodeSelect, requests.data, seriesTmdbId ]);

    if (!seasons.length) return null;

    const createStatus = isAxiosError(createError) ? createError.response?.status : undefined;

    const seasonName = seasonOptions.find(option => option.id === String(seasonNumber))?.name ?? '';

    let content: React.ReactNode;
    if (details.isPending) {
        content = (
            <div className='pf-episodes__grid' aria-busy='true'>
                {Array.from({ length: SKELETON_COUNT }, (_, index) => <CardBone key={index} shape='landscape' />)}
                <span className='pf-visually-hidden'>{t('Loading')}</span>
            </div>
        );
    } else if (details.isError) {
        content = (
            <p className='pf-row__error' role='status'>
                <ErrorOutline aria-hidden='true' />
                {t('RowLoadError')}
            </p>
        );
    } else {
        content = (
            <ul ref={gridRef} className='pf-episodes__grid' {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}>
                {shown?.map(episode => <li key={getEpisodeKey(episode)}>{renderEpisode(episode)}</li>)}
            </ul>
        );
    }

    return (
        <section className='pf-details__episodes pf-episodes' aria-labelledby={headingId}>
            <ChoicePicker
                label={t('SeasonsLabel')}
                options={seasonOptions}
                selectedId={seasonNumber !== undefined ? String(seasonNumber) : undefined}
                onSelect={onSeasonSelect}
                isRail
            />
            <div className='pf-episodes__head'>
                <h2 id={headingId} className='pf-episodes__title'>{seasonName}</h2>
                {watchedCount !== undefined && episodes && (
                    <span className='pf-episodes__count'>{t('SeasonWatchedCount', watchedCount, episodes.length)}</span>
                )}
            </div>
            {content}
            {isCut && episodes && (
                <button
                    type='button'
                    className='pf-button pf-button--quiet pf-episodes__more'
                    onClick={showAll}
                    {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                >
                    {t('ActionShowAllEpisodes', episodes.length)}
                </button>
            )}
            {isCreateError && (
                <p className='pf-row__error' role='alert'>
                    <ErrorOutline aria-hidden='true' />
                    {t(getCreateErrorLabel(createStatus))}
                </p>
            )}
        </section>
    );
};

export default SeriesEpisodes;
