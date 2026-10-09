import type { StringKey } from '../../../i18n/translate';
import { CatalogItemKind } from '../../catalog/api/types';

import { DiscoverType, DOCUMENTARY_GENRE_ID } from './discover';

type Translate = (key: StringKey, ...args: Array<string | number>) => string;

/** Order of a TMDB themed row (see the `sort` of `Pufferfin/Catalog/Discover`). */
export type DiscoverSort = 'Popular' | 'TopRated' | 'Newest';

/** Themes of the audiobook rows (see the `theme` of `Pufferfin/Catalog/Audiobooks/Popular`). */
export type AudiobookTheme =
    | 'Horror' | 'Thriller' | 'Crime' | 'Fantasy' | 'ScienceFiction' | 'Romance'
    | 'History' | 'Biography' | 'SelfDevelopment' | 'Classics' | 'Children' | 'Comedy';

/** A themed row of films or series, read from the TMDB discover endpoint. */
export interface TitleThemeRow {
    source: 'tmdb'
    id: string
    kind: CatalogItemKind.Movie | CatalogItemKind.Series
    genreId?: number
    tvTypes?: string[]
    sort: DiscoverSort
    year?: number
    originalLanguage?: string
    title: (t: Translate) => string
}

/** A genre row of audiobooks, read from the Audible best sellers or new releases of a theme. */
export interface AudiobookThemeRow {
    source: 'audible'
    id: string
    theme: AudiobookTheme
    sort: 'BestSellers' | 'NewReleases'
    title: (t: Translate) => string
}

export type ThemeRow = TitleThemeRow | AudiobookThemeRow;

/** A genre and its TMDB ids, which differ between films and series for some genres. */
interface Genre {
    key: string
    label: StringKey
    movieId?: number
    tvId?: number
}

const GENRES: Genre[] = [
    { key: 'action', label: 'GenreAction', movieId: 28, tvId: 10759 },
    { key: 'adventure', label: 'GenreAdventure', movieId: 12 },
    { key: 'animation', label: 'GenreAnimation', movieId: 16, tvId: 16 },
    { key: 'comedy', label: 'GenreComedy', movieId: 35, tvId: 35 },
    { key: 'crime', label: 'GenreCrime', movieId: 80, tvId: 80 },
    { key: 'drama', label: 'GenreDrama', movieId: 18, tvId: 18 },
    { key: 'family', label: 'GenreFamily', movieId: 10751, tvId: 10751 },
    { key: 'fantasy', label: 'GenreFantasy', movieId: 14 },
    { key: 'history', label: 'GenreHistory', movieId: 36 },
    { key: 'horror', label: 'GenreHorror', movieId: 27 },
    { key: 'mystery', label: 'GenreMystery', movieId: 9648, tvId: 9648 },
    { key: 'romance', label: 'GenreRomance', movieId: 10749 },
    { key: 'scifi', label: 'GenreScienceFiction', movieId: 878, tvId: 10765 },
    { key: 'thriller', label: 'GenreThriller', movieId: 53 },
    { key: 'war', label: 'GenreWar', movieId: 10752, tvId: 10768 },
    { key: 'western', label: 'GenreWestern', movieId: 37, tvId: 37 }
];

/** The genres of audiobooks: the Audible themes, named as genres. */
const AUDIOBOOK_GENRES: Array<{ theme: AudiobookTheme, label: StringKey }> = [
    { theme: 'Horror', label: 'GenreHorror' },
    { theme: 'Thriller', label: 'GenreThriller' },
    { theme: 'Crime', label: 'GenreCrime' },
    { theme: 'Fantasy', label: 'GenreFantasy' },
    { theme: 'ScienceFiction', label: 'GenreScienceFiction' },
    { theme: 'Romance', label: 'GenreRomance' },
    { theme: 'History', label: 'GenreHistory' },
    { theme: 'Biography', label: 'GenreBiography' },
    { theme: 'SelfDevelopment', label: 'GenreSelfHelp' },
    { theme: 'Classics', label: 'GenreClassics' },
    { theme: 'Children', label: 'GenreKids' },
    { theme: 'Comedy', label: 'GenreComedy' }
];

/** The unscripted shows, as genres: TMDB series types. */
const TV_GENRES: Array<{ type: string, label: StringKey }> = [
    { type: 'Reality', label: 'GenreReality' },
    { type: 'TalkShow', label: 'GenreTalkShow' },
    { type: 'News', label: 'GenreNews' }
];

/** How long one selection of themed rows stays: the screen changes a few times a day, never while browsing. */
export const THEME_SLOT_MS = 3 * 60 * 60 * 1000;

type TitleKind = CatalogItemKind.Movie | CatalogItemKind.Series;

/** Title templates of a genre row, by order: `{0}` is the genre, `{1}` the year. */
type Templates = Record<'Popular' | 'TopRated' | 'TopRatedYear' | 'Newest', StringKey>;

const MOVIE_TEMPLATES: Templates = {
    Popular: 'ThemeMoviesPopular',
    TopRated: 'ThemeMoviesBest',
    TopRatedYear: 'ThemeMoviesBestOfYear',
    Newest: 'ThemeMoviesNew'
};

const SERIES_TEMPLATES: Templates = {
    Popular: 'ThemeSeriesPopular',
    TopRated: 'ThemeSeriesBest',
    TopRatedYear: 'ThemeSeriesBestOfYear',
    Newest: 'ThemeSeriesNew'
};

const SHOW_TEMPLATES: Templates = {
    Popular: 'ThemeShowsPopular',
    TopRated: 'ThemeShowsBest',
    TopRatedYear: 'ThemeShowsBestOfYear',
    Newest: 'ThemeShowsNew'
};

/** The four rows of one genre: popular, best, best of the year, new. */
function variants<T extends { id: string }>(
    id: string,
    label: StringKey,
    templates: Templates,
    year: number,
    make: (sort: DiscoverSort, year?: number) => Omit<T, 'id' | 'title'>
): T[] {
    return [
        { ...make('Popular'), id: `${id}-popular`, title: (t: Translate) => t(templates.Popular, t(label)) },
        { ...make('TopRated'), id: `${id}-best`, title: (t: Translate) => t(templates.TopRated, t(label)) },
        { ...make('TopRated', year), id: `${id}-best-${year}`, title: (t: Translate) => t(templates.TopRatedYear, t(label), year) },
        { ...make('Newest'), id: `${id}-new`, title: (t: Translate) => t(templates.Newest, t(label)) }
    ] as unknown as T[];
}

function genreRows(kind: TitleKind, year: number): TitleThemeRow[] {
    const isMovie = kind === CatalogItemKind.Movie;
    return GENRES.flatMap(genre => {
        const genreId = isMovie ? genre.movieId : genre.tvId;
        if (!genreId) return [];
        return variants<TitleThemeRow>(`${kind}-${genre.key}`, genre.label, isMovie ? MOVIE_TEMPLATES : SERIES_TEMPLATES, year,
            (sort, rowYear) => ({ source: 'tmdb', kind, genreId, sort, year: rowYear }));
    });
}

function documentaryRows(year: number): TitleThemeRow[] {
    return ([ CatalogItemKind.Movie, CatalogItemKind.Series ] as TitleKind[]).flatMap(kind => variants<TitleThemeRow>(
        `doc-${kind}`, 'GenreDocumentary', kind === CatalogItemKind.Movie ? MOVIE_TEMPLATES : SERIES_TEMPLATES, year,
        (sort, rowYear) => ({ source: 'tmdb', kind, genreId: DOCUMENTARY_GENRE_ID, sort, year: rowYear })
    ));
}

function tvShowRows(year: number): TitleThemeRow[] {
    return TV_GENRES.flatMap(({ type, label }) => variants<TitleThemeRow>(`tv-${type}`, label, SHOW_TEMPLATES, year,
        (sort, rowYear) => ({ source: 'tmdb', kind: CatalogItemKind.Series, tvTypes: [ type ], sort, year: rowYear })));
}

/** Audible knows best sellers and new releases only: best and new for each genre. */
function audiobookRows(): AudiobookThemeRow[] {
    return AUDIOBOOK_GENRES.flatMap(({ theme, label }) => [
        { source: 'audible' as const, id: `audiobook-${theme}`, theme, sort: 'BestSellers' as const, title: (t: Translate) => t('ThemeAudiobooksBest', t(label)) },
        { source: 'audible' as const, id: `audiobook-${theme}-new`, theme, sort: 'NewReleases' as const, title: (t: Translate) => t('ThemeAudiobooksNew', t(label)) }
    ]);
}

/** Every themed row a type can show, before the selection: genres and their variants only. */
export function getThemePool(type: DiscoverType, year: number): ThemeRow[] {
    switch (type) {
        case DiscoverType.Movies:
            return genreRows(CatalogItemKind.Movie, year);
        case DiscoverType.Series:
            return genreRows(CatalogItemKind.Series, year);
        case DiscoverType.TvShows:
            return tvShowRows(year);
        case DiscoverType.Documentaries:
            return documentaryRows(year);
        case DiscoverType.Audiobooks:
            return audiobookRows();
        case DiscoverType.All:
            return [
                ...genreRows(CatalogItemKind.Movie, year),
                ...genreRows(CatalogItemKind.Series, year),
                ...audiobookRows(),
                ...tvShowRows(year),
                ...documentaryRows(year)
            ];
        default:
            return [];
    }
}

/** How many themed rows a type shows. */
const THEME_COUNT: Partial<Record<DiscoverType, number>> = {
    [DiscoverType.All]: 22,
    [DiscoverType.Movies]: 16,
    [DiscoverType.Series]: 12,
    [DiscoverType.TvShows]: 6,
    [DiscoverType.Documentaries]: 8,
    [DiscoverType.Audiobooks]: 12
};

/** Small seeded generator (mulberry32): the same seed gives the same selection. */
function random(seed: number) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function hash(text: string) {
    let value = 2166136261;
    for (let index = 0; index < text.length; index++) {
        value = Math.imul(value ^ text.charCodeAt(index), 16777619);
    }
    return value >>> 0;
}

/** What tells two rows apart in the mix: films, series or audiobooks. */
export const familyOf = (row: ThemeRow) => (row.source === 'audible' ? 'audiobook' : row.kind);

/** The genre of a row, so one genre shows once per screen and kind. */
const subjectOf = (row: ThemeRow) => {
    if (row.source === 'audible') return `a-${row.theme}`;
    return `${row.kind}-${row.genreId ?? row.tvTypes?.join() ?? 'all'}`;
};

/**
 * The themed rows of a screen for a time slot (films and series only when
 * `titlesOnly`, as under a streaming service filter): a seeded shuffle of the pool,
 * one row per genre while genres last, and on All films, series and audiobooks taking turns, so
 * the mix stays varied. The same slot always gives the same rows: Back finds
 * the screen as it was, and it changes a few times a day.
 */
export function pickThemeRows(type: DiscoverType, now: number, options: { titlesOnly?: boolean, seriesOnly?: boolean } = {}): ThemeRow[] {
    const year = new Date(now).getFullYear();
    const slot = Math.floor(now / THEME_SLOT_MS);
    const next = random(hash(`${type}:${slot}`));
    // A streaming service filter keeps the films and series: audiobooks are not on Netflix
    const pool = getThemePool(type, year)
        .filter(row => !options.titlesOnly || row.source === 'tmdb')
        // A network airs series: no film row under it
        .filter(row => !options.seriesOnly || (row.source === 'tmdb' && row.kind === CatalogItemKind.Series))
        .map(row => ({ row, order: next() }))
        .sort((a, b) => a.order - b.order)
        .map(({ row }) => row);

    const count = THEME_COUNT[type] ?? 0;
    const picked: ThemeRow[] = [];
    const subjects = new Set<string>();
    // One row per genre and kind first: "Best horror films" and "New horror films" only when genres run out
    const firsts: ThemeRow[] = [];
    const seconds: ThemeRow[] = [];
    pool.forEach(row => {
        (subjects.has(subjectOf(row)) ? seconds : firsts).push(row);
        subjects.add(subjectOf(row));
    });
    const remaining = firsts.length < count ? [ ...firsts, ...seconds ] : firsts;

    while (picked.length < count && remaining.length) {
        const last = picked[picked.length - 1];
        // The next row of another family when there is one: films, series and books take turns
        let index = last ? remaining.findIndex(row => familyOf(row) !== familyOf(last)) : 0;
        if (index < 0) index = 0;
        picked.push(remaining.splice(index, 1)[0]);
    }
    return picked;
}
