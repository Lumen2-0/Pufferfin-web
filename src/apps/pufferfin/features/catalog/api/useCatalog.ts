import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

import { getPufferfin } from '../../../api/client';
import type { CatalogTitleKind } from '../../../routes/paths';
import { getCatalogListFailure } from '../utils/catalog';
import { CatalogItemKind, type CatalogListResponse, type CatalogTitleDetails } from './types';

const ROW_LIMIT = 20;

/**
 * Reads a catalog list. An empty list from a source that failed becomes a
 * query error, so the row says it could not load instead of silently vanishing.
 * An empty list from a source that is not configured stays empty: the row hides.
 */
const toItems = (response: CatalogListResponse) => {
    const failure = getCatalogListFailure(response);
    if (failure) throw new Error(`[Pufferfin] Catalog source ${failure.Source} is ${failure.Status}`);
    return response.Items;
};

/** Films or series trending on TMDB this week, each marked on disk or missing. */
export const useTrending = (kind: CatalogTitleKind) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Catalog', 'Trending', kind, user?.Id ],
        queryFn: async ({ signal }) => toItems(await getPufferfin<CatalogListResponse>(
            api!,
            '/Pufferfin/Catalog/Trending',
            { params: { kind, limit: ROW_LIMIT }, signal }
        )),
        enabled: !!api && !!user?.Id
    });
};

/** Films recommended from the user's Letterboxd diary, without the ones already seen. */
export const useRecommendedForYou = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Catalog', 'ForYou', user?.Id ],
        queryFn: async ({ signal }) => toItems(await getPufferfin<CatalogListResponse>(
            api!,
            '/Pufferfin/Catalog/Recommendations/ForYou',
            { params: { limit: ROW_LIMIT }, signal }
        )),
        enabled: !!api && !!user?.Id
    });
};

/** The TMDB sheet of a film or a series. */
export const useCatalogTitle = (kind: CatalogTitleKind, tmdbId: number) => {
    const { api, user } = useApi();
    const path = kind === CatalogItemKind.Series ? 'Series' : 'Movies';
    return useQuery({
        queryKey: [ 'Pufferfin', 'Catalog', 'Title', kind, tmdbId, user?.Id ],
        queryFn: ({ signal }) => getPufferfin<CatalogTitleDetails>(
            api!,
            `/Pufferfin/Catalog/${path}/${tmdbId}`,
            { signal }
        ),
        enabled: !!api && !!user?.Id
    });
};
