import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';

import type { StringKey } from '../../../i18n/translate';

/** The content types of the Discover picker, in their order on screen. */
export enum DiscoverType {
    All = 'all',
    Movies = 'movies',
    Series = 'series',
    TvShows = 'tvshows',
    Documentaries = 'documentaries',
    Audiobooks = 'audiobooks',
    Books = 'books'
}

/**
 * Rows a Discover screen can show. Catalog rows mix titles on disk and missing
 * ones; disk rows are what the library already has.
 */
export enum DiscoverRow {
    ContinueWatching = 'continueWatching',
    NextUp = 'nextUp',
    RecommendedForYou = 'recommendedForYou',
    TrendingMovies = 'trendingMovies',
    TrendingShows = 'trendingShows',
    RecentlyAdded = 'recentlyAdded',
    Downloads = 'downloads',
    Audiobooks = 'audiobooks',
    LiveTvOnNow = 'liveTvOnNow',
    Recordings = 'recordings',
    Books = 'books'
}

export const DISCOVER_TYPE_PARAM = 'type';

/**
 * Types with at least one source today. Documentaries need a catalog list by
 * TMDB genre, which the server does not offer yet: the entry comes with it.
 */
export const DISCOVER_TYPES: DiscoverType[] = [
    DiscoverType.All,
    DiscoverType.Movies,
    DiscoverType.Series,
    DiscoverType.TvShows,
    DiscoverType.Audiobooks,
    DiscoverType.Books
];

export const DISCOVER_TYPE_LABELS: Record<DiscoverType, StringKey> = {
    [DiscoverType.All]: 'DiscoverTypeAll',
    [DiscoverType.Movies]: 'DiscoverTypeMovies',
    [DiscoverType.Series]: 'DiscoverTypeSeries',
    [DiscoverType.TvShows]: 'DiscoverTypeTvShows',
    [DiscoverType.Documentaries]: 'DiscoverTypeDocumentaries',
    [DiscoverType.Audiobooks]: 'DiscoverTypeAudiobooks',
    [DiscoverType.Books]: 'DiscoverTypeBooks'
};

const ROWS: Record<DiscoverType, DiscoverRow[]> = {
    [DiscoverType.All]: [
        DiscoverRow.ContinueWatching,
        DiscoverRow.NextUp,
        DiscoverRow.RecommendedForYou,
        DiscoverRow.TrendingMovies,
        DiscoverRow.TrendingShows,
        DiscoverRow.RecentlyAdded,
        DiscoverRow.Downloads,
        DiscoverRow.Audiobooks
    ],
    [DiscoverType.Movies]: [
        DiscoverRow.ContinueWatching,
        DiscoverRow.RecommendedForYou,
        DiscoverRow.TrendingMovies,
        DiscoverRow.RecentlyAdded
    ],
    [DiscoverType.Series]: [
        DiscoverRow.ContinueWatching,
        DiscoverRow.NextUp,
        DiscoverRow.TrendingShows,
        DiscoverRow.RecentlyAdded
    ],
    // Fiction goes to Series; unscripted TMDB shows come with a catalog list by type
    [DiscoverType.TvShows]: [
        DiscoverRow.LiveTvOnNow,
        DiscoverRow.Recordings
    ],
    [DiscoverType.Documentaries]: [],
    [DiscoverType.Audiobooks]: [
        DiscoverRow.Audiobooks,
        DiscoverRow.RecentlyAdded
    ],
    [DiscoverType.Books]: [
        DiscoverRow.Books
    ]
};

/** The rows of a Discover screen, top to bottom. */
export const getDiscoverRows = (type: DiscoverType) => ROWS[type];

/** Whether the screen opens on a featured title: the video types only. */
export const hasFeatured = (type: DiscoverType) =>
    type === DiscoverType.All || type === DiscoverType.Movies || type === DiscoverType.Series;

/** Reads the type of the address; an unknown or unavailable value falls back to All. */
export function parseDiscoverType(value: string | null | undefined): DiscoverType {
    return DISCOVER_TYPES.find(type => type === value) ?? DiscoverType.All;
}

/**
 * Item types of the disk rows (Continue Watching, Recently Added) of a type.
 * Undefined means every type, for All.
 */
export function getDiskItemTypes(type: DiscoverType): BaseItemKind[] | undefined {
    switch (type) {
        case DiscoverType.Movies:
            return [ BaseItemKind.Movie ];
        case DiscoverType.Series:
            return [ BaseItemKind.Episode ];
        case DiscoverType.Audiobooks:
            return [ BaseItemKind.AudioBook ];
        case DiscoverType.Books:
            return [ BaseItemKind.Book ];
        default:
            return undefined;
    }
}
