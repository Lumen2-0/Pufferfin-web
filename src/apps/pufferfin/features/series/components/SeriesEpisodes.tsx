import { isAxiosError } from 'axios';
import React, { type FC, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useApi } from 'hooks/useApi';

import ChoicePicker from '../../../components/ChoicePicker';
import MediaRow from '../../../components/MediaRow';
import { useTranslation } from '../../../i18n/useTranslation';
import { getDownloadsPath } from '../../../routes/paths';
import { playItem, playItemById } from '../../../utils/playback';
import type { CatalogEpisode, CatalogSeason } from '../../catalog/api/types';
import { useSeasonEpisodes } from '../../catalog/api/useCatalog';
import { useEpisodes } from '../../details/api/useDetails';
import { RequestKind, RequestState } from '../../requests/api/types';
import { useCreateRequest, useMyRequests } from '../../requests/api/useRequests';
import { isRequestStale } from '../../requests/utils/requests';
import { getCreateErrorLabel } from '../../requests/utils/status';
import { useNow } from '../../requests/utils/useNow';
import { findEpisodeRequest, getDefaultSeasonNumber, getEpisodeKey } from '../utils/episodes';
import EpisodeCard, { type EpisodeAction, useLibraryImageUrl } from './EpisodeCard';
import { ErrorOutline } from '../../../components/icons';

interface SeriesEpisodesProps {
    seriesTmdbId: number
    /** The seasons from `useSeriesSeasons`, TMDB merged with the library. */
    seasons: CatalogSeason[]
    /** Library item of the series, when it is on disk: its episodes bring their images and watch progress. */
    seriesItemId?: string
    /** Library season holding the next episode to watch, shown first. */
    nextUpSeasonItemId?: string | null
    /** Sonarr is enabled and the account may request: otherwise missing episodes offer no download. */
    canRequest: boolean
}

/**
 * Seasons and episodes of a series, TMDB merged with the disk by the server:
 * each episode appears once. An episode on disk plays; a missing one carries
 * a Download badge and is requested on its own when selected; once requested
 * its card tells where the request stands and opens the downloads panel.
 */
const SeriesEpisodes: FC<SeriesEpisodesProps> = ({ seriesTmdbId, seasons, seriesItemId, nextUpSeasonItemId, canRequest }) => {
    const t = useTranslation();
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

    const renderEpisode = useCallback((episode: CatalogEpisode) => (
        <EpisodeCard
            episode={episode}
            libraryItem={episode.LocalItemId ? libraryById.get(episode.LocalItemId) : undefined}
            request={findEpisodeRequest(requests.data, seriesTmdbId, episode)}
            isStale={isStale}
            canRequest={canRequest}
            onSelect={onEpisodeSelect}
            getLibraryImageUrl={getLibraryImageUrl}
        />
    ), [ canRequest, getLibraryImageUrl, isStale, libraryById, onEpisodeSelect, requests.data, seriesTmdbId ]);

    if (!seasons.length) return null;

    const createStatus = isAxiosError(createError) ? createError.response?.status : undefined;

    return (
        <section className='pf-details__episodes' aria-label={t('SeasonsLabel')}>
            <ChoicePicker
                label={t('SeasonsLabel')}
                options={seasonOptions}
                selectedId={seasonNumber !== undefined ? String(seasonNumber) : undefined}
                onSelect={onSeasonSelect}
            />
            <MediaRow
                title={seasonOptions.find(option => option.id === String(seasonNumber))?.name ?? ''}
                shape='landscape'
                items={details.data?.Episodes}
                isPending={details.isPending}
                isError={details.isError}
                getKey={getEpisodeKey}
                renderItem={renderEpisode}
            />
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
