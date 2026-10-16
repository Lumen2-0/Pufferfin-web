import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';

import type { StringKey } from '../../../i18n/translate';

/** The content types of the Discover picker, in their order on screen. */
export enum DiscoverType {
    All = 'all',
    Movies = 'movies',
    Series = 'series',
    TvShows = 'tvshows',
    Documentaries = 'documentaries',
    Audiobooks = 'audiobooks'
}

/**
 * Rows a Discover screen can show. Discover is for finding something new:
 * catalog rows mix titles on disk and missing ones, opened by the tops of the
 * moment; the disk rows are what is being watched, what just arrived on the
 * server, and the titles the user put aside (Bookmarks).
 */
export enum DiscoverRow {
    TopMoviesWeek = 'topMoviesWeek',
    TopMoviesMonth = 'topMoviesMonth',
    TopMoviesYear = 'topMoviesYear',
    TopShowsWeek = 'topShowsWeek',
    TopShowsMonth = 'topShowsMonth',
    TopShowsYear = 'topShowsYear',
    ContinueWatching = 'continueWatching',
    NewOnServer = 'newOnServer',
    BecauseYouWatched = 'becauseYouWatched',
    NewReleasesMovies = 'newReleasesMovies',
    NewReleasesSeries = 'newReleasesSeries',
    ClassicsMovies = 'classicsMovies',
    ClassicsSeries = 'classicsSeries',
    ClassicsAnime = 'classicsAnime',
    Seasonal = 'seasonal',
    Bookmarks = 'bookmarks',
    RecommendedForYou = 'recommendedForYou',
    TrendingMovies = 'trendingMovies',
    TrendingShows = 'trendingShows',
    Downloads = 'downloads',
    AudiobookBestSellers = 'audiobookBestSellers',
    AudiobookNewReleases = 'audiobookNewReleases',
    LiveTvOnNow = 'liveTvOnNow',
    Recordings = 'recordings',
    DocumentaryMovies = 'documentaryMovies',
    DocumentarySeries = 'documentarySeries',
    PopularTvShows = 'popularTvShows'
}

export const DISCOVER_TYPE_PARAM = 'type';

/** TMDB genre of animation, for films and series alike. */
export const ANIMATION_GENRE_ID = 16;

/** TMDB genre of documentaries, for films and series alike. */
export const DOCUMENTARY_GENRE_ID = 99;

/**
 * TMDB series types of TV Shows: the unscripted ones. Fiction, including
 * episodic series, goes to Series (owner's decision on PUFF-12).
 */
export const TV_SHOW_TYPES = [ 'Reality', 'TalkShow', 'News' ];

interface Season {
    title: StringKey
    /** TMDB keywords of the theme, any of them matching: films and series must have one. */
    keywordIds: number[]
    /** TMDB film genre the films must also have (series have no horror or romance genre on TMDB). */
    movieGenreId?: number
    /** TMDB genres of the theme, film and series ids: the more a title has, the earlier it comes. */
    genreIds: number[]
    /** First and last day shown, as [month, day], months from 1. */
    from: [ number, number ]
    to: [ number, number ]
}

/** The seasonal rows, each shown in its weeks of the year. */
const SEASONS: Season[] = [
    {
        title: 'RowSeasonValentine',
        // valentine's day, valentine, romance, romantic drama, feel good, feelgood
        keywordIds: [ 160404, 251912, 9840, 304976, 383896, 275276 ],
        movieGenreId: 10749,
        // romance, comedy (romantic comedy), drama (romantic drama)
        genreIds: [ 10749, 35, 18 ],
        from: [ 2, 1 ],
        to: [ 2, 14 ]
    },
    {
        title: 'RowSeasonHalloween',
        // halloween, horror, gore, psychological horror, slasher, haunted house, ghost, demonic possession,
        // supernatural, zombie, vampire, witch
        keywordIds: [ 3335, 315058, 10292, 295907, 12339, 3358, 162846, 161261, 6152, 12377, 3133, 616 ],
        movieGenreId: 27,
        // horror, thriller, mystery
        genreIds: [ 27, 53, 9648 ],
        from: [ 10, 1 ],
        to: [ 10, 31 ]
    },
    {
        title: 'RowSeasonChristmas',
        // christmas, santa claus, christmas eve, christmas spirit, christmas tree
        keywordIds: [ 207317, 1991, 260365, 193048, 5570 ],
        // comedy, romance, family, fantasy (film), sci-fi & fantasy (series), animation
        genreIds: [ 35, 10749, 10751, 14, 10765, 16 ],
        from: [ 12, 1 ],
        to: [ 12, 26 ]
    }
];

/**
 * Films and series of a season in one row, taken in turns so both stay mixed: in each list,
 * the titles with the most genres of the theme first, the better rated first among equals.
 */
export function rankSeasonal<T extends { GenreIds?: number[] | null }>(lists: T[][], genreIds: number[]): T[] {
    const score = (item: T) => item.GenreIds?.filter(id => genreIds.includes(id)).length ?? 0;
    const ranked = lists.map(list => [ ...list ].sort((a, b) => score(b) - score(a)));
    const longest = Math.max(0, ...ranked.map(list => list.length));
    return Array.from({ length: longest }, (_, index) => ranked.flatMap(list => list[index] ?? [])).flat();
}

/** The season of the date, if any. */
export function getSeason(date = new Date()): Season | undefined {
    const day = (date.getMonth() + 1) * 100 + date.getDate();
    return SEASONS.find(({ from, to }) => day >= from[0] * 100 + from[1] && day <= to[0] * 100 + to[1]);
}

/** The types offered by the picker, in their order on screen. */
export const DISCOVER_TYPES: DiscoverType[] = [
    DiscoverType.All,
    DiscoverType.Movies,
    DiscoverType.Series,
    DiscoverType.TvShows,
    DiscoverType.Documentaries,
    DiscoverType.Audiobooks
];

export const DISCOVER_TYPE_LABELS: Record<DiscoverType, StringKey> = {
    [DiscoverType.All]: 'DiscoverTypeAll',
    [DiscoverType.Movies]: 'DiscoverTypeMovies',
    [DiscoverType.Series]: 'DiscoverTypeSeries',
    [DiscoverType.TvShows]: 'DiscoverTypeTvShows',
    [DiscoverType.Documentaries]: 'DiscoverTypeDocumentaries',
    [DiscoverType.Audiobooks]: 'DiscoverTypeAudiobooks'
};

/**
 * The rows above the genre rows. Films and series open on the top 10 of the
 * moment, then what is being watched, the picks for the user, what just
 * arrived, and the new and the timeless; the genres and their variants follow.
 */
const ROWS: Record<DiscoverType, DiscoverRow[]> = {
    [DiscoverType.All]: [
        DiscoverRow.Bookmarks,
        DiscoverRow.ContinueWatching,
        DiscoverRow.Seasonal,
        DiscoverRow.TopMoviesMonth,
        DiscoverRow.TopShowsMonth,
        DiscoverRow.RecommendedForYou,
        DiscoverRow.ClassicsSeries,
        DiscoverRow.ClassicsMovies,
        DiscoverRow.ClassicsAnime
    ],
    [DiscoverType.Movies]: [
        DiscoverRow.Bookmarks,
        DiscoverRow.ContinueWatching,
        DiscoverRow.TopMoviesWeek,
        DiscoverRow.TopMoviesMonth,
        DiscoverRow.TopMoviesYear,
        DiscoverRow.RecommendedForYou,
        DiscoverRow.BecauseYouWatched,
        DiscoverRow.NewReleasesMovies,
        DiscoverRow.ClassicsMovies
    ],
    [DiscoverType.Series]: [
        DiscoverRow.Bookmarks,
        DiscoverRow.ContinueWatching,
        DiscoverRow.TopShowsWeek,
        DiscoverRow.TopShowsMonth,
        DiscoverRow.TopShowsYear,
        DiscoverRow.BecauseYouWatched,
        DiscoverRow.NewReleasesSeries,
        DiscoverRow.ClassicsSeries
    ],
    [DiscoverType.TvShows]: [ DiscoverRow.LiveTvOnNow, DiscoverRow.Recordings ],
    [DiscoverType.Documentaries]: [],
    [DiscoverType.Audiobooks]: []
};

/** The rows of a Discover screen, top to bottom. */
export const getDiscoverRows = (type: DiscoverType) => ROWS[type];

/** Whether the screen opens on the featured carousel: every type but the audiobooks. */
export const hasFeatured = (type: DiscoverType) => type !== DiscoverType.Audiobooks;

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
        default:
            return undefined;
    }
}
