import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

import { getPufferfin } from '../../../api/client';
import type { CatalogTitleKind } from '../../../routes/paths';
import { isSearchable, normalizeQuery } from '../../search/utils/query';
import { getCatalogListFailure } from '../utils/catalog';
import {
    type CatalogAudiobookDetails,
    CatalogItemKind,
    type CatalogListResponse,
    type CatalogSeasonDetails,
    type CatalogSeriesSeasons,
    type CatalogTitleDetails
} from './types';

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

/** Filters of a catalog list by genre or by kind of series (the TMDB discover endpoint). */
export interface CatalogDiscoverFilter {
    /** TMDB genre id, such as 99 for documentaries. */
    genreId?: number
    /** TMDB series types, for series only: Documentary, News, Miniseries, Reality, Scripted, TalkShow, Video. */
    tvTypes?: string[]
}

/** The most popular films or series matching the filter, each marked on disk or missing. */
export const useCatalogDiscover = (kind: CatalogTitleKind, filter: CatalogDiscoverFilter) => {
    const { api, user } = useApi();
    const tvTypes = filter.tvTypes?.join(',');
    return useQuery({
        queryKey: [ 'Pufferfin', 'Catalog', 'Discover', kind, filter.genreId, tvTypes, user?.Id ],
        queryFn: async ({ signal }) => toItems(await getPufferfin<CatalogListResponse>(
            api!,
            '/Pufferfin/Catalog/Discover',
            { params: { kind, genreId: filter.genreId, tvTypes, limit: ROW_LIMIT }, signal }
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

/** The seasons of a series, TMDB merged with the library of the current user. */
export const useSeriesSeasons = (tmdbId: number | undefined) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Catalog', 'Seasons', tmdbId, user?.Id ],
        queryFn: ({ signal }) => getPufferfin<CatalogSeriesSeasons>(
            api!,
            `/Pufferfin/Catalog/Series/${tmdbId}/Seasons`,
            { signal }
        ),
        enabled: !!api && !!user?.Id && !!tmdbId
    });
};

/** The episodes of one season, each once: on disk with its library item, or missing. */
export const useSeasonEpisodes = (tmdbId: number | undefined, seasonNumber: number | undefined) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Catalog', 'Season', tmdbId, seasonNumber, user?.Id ],
        queryFn: ({ signal }) => getPufferfin<CatalogSeasonDetails>(
            api!,
            `/Pufferfin/Catalog/Series/${tmdbId}/Seasons/${seasonNumber}`,
            { signal }
        ),
        enabled: !!api && !!user?.Id && !!tmdbId && seasonNumber !== undefined
    });
};

/**
 * Audiobooks matching a search, in the configured Audible markets and
 * languages, each marked on disk or missing. Complete editions come next to
 * the volumes, marked as such.
 */
export const useAudiobookSearch = (query: string) => {
    const { api, user } = useApi();
    const keywords = normalizeQuery(query);
    return useQuery({
        queryKey: [ 'Pufferfin', 'Catalog', 'Audiobooks', keywords, user?.Id ],
        queryFn: async ({ signal }) => toItems(await getPufferfin<CatalogListResponse>(
            api!,
            '/Pufferfin/Catalog/Audiobooks',
            { params: { keywords, limit: ROW_LIMIT }, signal }
        )),
        enabled: !!api && !!user?.Id && isSearchable(keywords),
        // Results stay on screen while the next query loads, instead of flashing empty
        placeholderData: keepPreviousData
    });
};

/** The sheet of an audiobook, read first in the market it was found in. */
export const useAudiobook = (asin: string, market: string | undefined) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Catalog', 'Audiobook', asin, market, user?.Id ],
        queryFn: ({ signal }) => getPufferfin<CatalogAudiobookDetails>(
            api!,
            `/Pufferfin/Catalog/Audiobooks/${asin}`,
            { params: market ? { market } : undefined, signal }
        ),
        enabled: !!api && !!user?.Id
    });
};
