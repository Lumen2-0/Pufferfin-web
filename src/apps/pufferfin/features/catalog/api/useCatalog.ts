import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

import { getPufferfin } from '../../../api/client';
import type { CatalogTitleKind } from '../../../routes/paths';
import { getCatalogListFailure } from '../utils/catalog';
import {
    type CatalogAudiobookDetails,
    type CatalogGenre,
    type CatalogPersonDetails,
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
export const useTrending = (kind: CatalogTitleKind, isEnabled = true) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Catalog', 'Trending', kind, user?.Id ],
        queryFn: async ({ signal }) => toItems(await getPufferfin<CatalogListResponse>(
            api!,
            '/Pufferfin/Catalog/Trending',
            { params: { kind, limit: ROW_LIMIT }, signal }
        )),
        enabled: !!api && !!user?.Id && isEnabled
    });
};

/** Filters of a catalog list by genre or by kind of series (the TMDB discover endpoint). */
export interface CatalogDiscoverFilter {
    /** TMDB genre id, such as 99 for documentaries. */
    genreId?: number
    /** TMDB series types, for series only: Documentary, News, Miniseries, Reality, Scripted, TalkShow, Video. */
    tvTypes?: string[]
    /** Most popular (default), best rated, or latest out. */
    sort?: 'Popular' | 'TopRated' | 'Newest'
    /** Year of release, first air year for a series. */
    year?: number
    /** Earliest release date, YYYY-MM-DD. */
    since?: string
    /** Original language, ISO 639-1. */
    originalLanguage?: string
    /** Key of a brand (`netflix`, `marvel`, `adultswim`): a streaming service, a studio or a network (see `useBrands`). */
    brand?: string
    /** TMDB keyword id, such as 207317 for Christmas. */
    keywords?: string
}

/** Films or series matching the filter, in its order, each marked on disk or missing. Waits while `isEnabled` is false. */
export const useCatalogDiscover = (kind: CatalogTitleKind, filter: CatalogDiscoverFilter, isEnabled = true) => {
    const { api, user } = useApi();
    const tvTypes = filter.tvTypes?.join(',');
    const { genreId, sort, year, since, originalLanguage, brand, keywords } = filter;
    return useQuery({
        queryKey: [ 'Pufferfin', 'Catalog', 'Discover', kind, genreId, tvTypes, sort, year, since, originalLanguage, brand, keywords, user?.Id ],
        queryFn: async ({ signal }) => toItems(await getPufferfin<CatalogListResponse>(
            api!,
            '/Pufferfin/Catalog/Discover',
            { params: { kind, genreId, tvTypes, sort, year, since, originalLanguage, brand, keywords, limit: ROW_LIMIT }, signal }
        )),
        enabled: !!api && !!user?.Id && isEnabled
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
export const useCatalogTitle = (kind: CatalogTitleKind, tmdbId: number, isEnabled = true) => {
    const { api, user } = useApi();
    const path = kind === CatalogItemKind.Series ? 'Series' : 'Movies';
    return useQuery({
        queryKey: [ 'Pufferfin', 'Catalog', 'Title', kind, tmdbId, user?.Id ],
        queryFn: ({ signal }) => getPufferfin<CatalogTitleDetails>(
            api!,
            `/Pufferfin/Catalog/${path}/${tmdbId}`,
            { signal }
        ),
        enabled: !!api && !!user?.Id && isEnabled
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

/** How the popular audiobooks are ranked by Audible. */
export type AudiobookPopularSort = 'BestSellers' | 'NewReleases';

/**
 * Popular audiobooks of the configured Audible markets, in the preferred audio
 * languages of the server, of one theme or of all, each marked on disk or
 * missing. Waits while `isEnabled` is false.
 */
export const usePopularAudiobooks = (sort: AudiobookPopularSort, theme?: string, isEnabled = true) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Catalog', 'PopularAudiobooks', sort, theme, user?.Id ],
        queryFn: async ({ signal }) => toItems(await getPufferfin<CatalogListResponse>(
            api!,
            '/Pufferfin/Catalog/Audiobooks/Popular',
            { params: { sort, theme, limit: ROW_LIMIT }, signal }
        )),
        enabled: !!api && !!user?.Id && isEnabled
    });
};

/** The sheet of an audiobook, read first in the market it was found in. */
export const useAudiobook = (asin: string, market: string | undefined, isEnabled = true) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Catalog', 'Audiobook', asin, market, user?.Id ],
        queryFn: ({ signal }) => getPufferfin<CatalogAudiobookDetails>(
            api!,
            `/Pufferfin/Catalog/Audiobooks/${asin}`,
            { params: market ? { market } : undefined, signal }
        ),
        enabled: !!api && !!user?.Id && isEnabled
    });
};

/** A person read from TMDB with their whole filmography, on disk or not. Waits without a TMDB id. */
export const useCatalogPerson = (tmdbId: number | undefined) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Catalog', 'Person', tmdbId, user?.Id ],
        queryFn: ({ signal }) => getPufferfin<CatalogPersonDetails>(api!, `/Pufferfin/Catalog/People/${tmdbId}`, { signal }),
        enabled: !!api && !!user?.Id && !!tmdbId
    });
};

/** What a brand filters by. */
export type BrandKind = 'Service' | 'Studio' | 'Network';

/** A brand Discover filters by: a streaming service, a studio or a network. */
export interface Brand {
    Key: string
    Name: string
    Kind: BrandKind
    /** The app icon of a service, the wordmark of a studio or a network. */
    LogoUrl: string
}

/** The brands Discover filters by, in their order on screen. */
export const useBrands = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Catalog', 'Brands', user?.Id ],
        queryFn: ({ signal }) => getPufferfin<Brand[]>(api!, '/Pufferfin/Catalog/Brands', { signal }),
        enabled: !!api && !!user?.Id,
        staleTime: Infinity
    });
};

/** The TMDB genres of films or series, for the words under a title. */
export const useCatalogGenres = (kind: CatalogTitleKind) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Catalog', 'Genres', kind, user?.Id ],
        queryFn: ({ signal }) => getPufferfin<CatalogGenre[]>(api!, '/Pufferfin/Catalog/Genres', { params: { kind }, signal }),
        enabled: !!api && !!user?.Id,
        staleTime: Infinity
    });
};
