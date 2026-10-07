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
 * Rows a Discover screen can show. Discover is for finding something new:
 * catalog rows mix titles on disk and missing ones; the only disk rows are the
 * ones about what is being watched (Continue Watching, Next Up). What the
 * library already holds is the Library tab.
 */
export enum DiscoverRow {
    ContinueWatching = 'continueWatching',
    NextUp = 'nextUp',
    RecommendedForYou = 'recommendedForYou',
    TrendingMovies = 'trendingMovies',
    TrendingShows = 'trendingShows',
    Downloads = 'downloads',
    AudiobookBestSellers = 'audiobookBestSellers',
    AudiobookNewReleases = 'audiobookNewReleases',
    LiveTvOnNow = 'liveTvOnNow',
    Recordings = 'recordings',
    TrendingBooks = 'trendingBooks',
    DocumentaryMovies = 'documentaryMovies',
    DocumentarySeries = 'documentarySeries',
    PopularTvShows = 'popularTvShows'
}

export const DISCOVER_TYPE_PARAM = 'type';

/** TMDB genre of documentaries, for films and series alike. */
export const DOCUMENTARY_GENRE_ID = 99;

/**
 * TMDB series types of TV Shows: the unscripted ones. Fiction, including
 * episodic series, goes to Series (owner's decision on PUFF-12).
 */
export const TV_SHOW_TYPES = [ 'Reality', 'TalkShow', 'News' ];

/** The types offered by the picker, in their order on screen. */
export const DISCOVER_TYPES: DiscoverType[] = [
    DiscoverType.All,
    DiscoverType.Movies,
    DiscoverType.Series,
    DiscoverType.TvShows,
    DiscoverType.Documentaries,
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
        DiscoverRow.Downloads,
        DiscoverRow.AudiobookBestSellers
    ],
    [DiscoverType.Movies]: [
        DiscoverRow.ContinueWatching,
        DiscoverRow.RecommendedForYou,
        DiscoverRow.TrendingMovies
    ],
    [DiscoverType.Series]: [
        DiscoverRow.ContinueWatching,
        DiscoverRow.NextUp,
        DiscoverRow.TrendingShows
    ],
    // Fiction goes to Series; here the unscripted shows, then live TV
    [DiscoverType.TvShows]: [
        DiscoverRow.PopularTvShows,
        DiscoverRow.LiveTvOnNow,
        DiscoverRow.Recordings
    ],
    [DiscoverType.Documentaries]: [
        DiscoverRow.DocumentaryMovies,
        DiscoverRow.DocumentarySeries
    ],
    [DiscoverType.Audiobooks]: [
        DiscoverRow.AudiobookBestSellers,
        DiscoverRow.AudiobookNewReleases
    ],
    [DiscoverType.Books]: [
        DiscoverRow.TrendingBooks
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
 * Item types of the disk rows (Continue Watching) and of the featured title of a type.
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
