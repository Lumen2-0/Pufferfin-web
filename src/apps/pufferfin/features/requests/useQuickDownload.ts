import { useCallback } from 'react';

import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';

import { getPufferfin } from '../../api/client';
import { type CatalogItem, CatalogItemKind, type CatalogSeriesSeasons } from '../catalog/api/types';
import { isMissing } from '../catalog/utils/catalog';
import { getMissingSeasons } from '../series/utils/episodes';
import { useCanRequest } from './api/useCanRequest';
import { useCreateRequest, useMyRequests } from './api/useRequests';
import { RequestKind } from './api/types';
import { findMovieRequest, findSeriesRequests } from './utils/requests';

/**
 * Download of a film or a series missing from the library, from its poster or
 * its large card: a film is asked at once, a series season by season, like its
 * sheet does. Nothing to show for a title on disk, or when the account may not request.
 */
export function useQuickDownload(item: CatalogItem) {
    const { api, user } = useApi();
    const isMovie = item.Kind === CatalogItemKind.Movie;
    const isSeries = item.Kind === CatalogItemKind.Series;
    const tmdbId = item.TmdbId ?? 0;
    const rights = useCanRequest(isMovie ? 'Radarr' : 'Sonarr');
    const requests = useMyRequests();
    const { mutateAsync: create } = useCreateRequest();

    const isRequested = isMovie ?
        !!findMovieRequest(requests.data, tmdbId) :
        findSeriesRequests(requests.data, tmdbId).length > 0;

    const download = useCallback(async () => {
        if (isMovie) {
            await create({ Kind: RequestKind.Movie, TmdbId: tmdbId }).catch(() => undefined);
            return;
        }
        if (!api) return;
        // The seasons are read on the click only: a row of posters does not ask for them all
        const seasons = await queryClient.fetchQuery({
            queryKey: [ 'Pufferfin', 'Catalog', 'Seasons', tmdbId, user?.Id ],
            queryFn: ({ signal }) => getPufferfin<CatalogSeriesSeasons>(api, `/Pufferfin/Catalog/Series/${tmdbId}/Seasons`, { signal })
        }).catch(() => undefined);
        for (const season of getMissingSeasons(seasons?.Seasons ?? [], new Date())) {
            await create({ Kind: RequestKind.Season, TmdbId: tmdbId, SeasonNumber: season.SeasonNumber }).catch(() => undefined);
        }
    }, [ api, create, isMovie, tmdbId, user?.Id ]);

    return {
        isAvailable: (isMovie || isSeries) && !!tmdbId && isMissing(item) && rights.canRequest,
        isRequested,
        download
    };
}
