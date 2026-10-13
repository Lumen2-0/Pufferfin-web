import type { StringKey } from '../../i18n/translate';

/** A genre the user can turn off, the same for films, series, shows and audiobooks. */
export type GenreKey =
    | 'action' | 'adventure' | 'animation' | 'comedy' | 'crime' | 'drama' | 'family' | 'fantasy'
    | 'history' | 'horror' | 'mystery' | 'romance' | 'scifi' | 'thriller' | 'war' | 'western'
    | 'documentary' | 'reality' | 'talkshow' | 'news' | 'kids' | 'biography' | 'selfhelp' | 'classics';

/** A genre of the preferences, with the TMDB genre ids of the titles it covers. */
export interface GenrePreference {
    key: GenreKey
    label: StringKey
    tmdbIds: number[]
}

/** Every genre of Discover, films, series, shows, documentaries and audiobooks alike. */
export const GENRE_PREFERENCES: GenrePreference[] = [
    { key: 'action', label: 'GenreAction', tmdbIds: [ 28, 10759 ] },
    { key: 'adventure', label: 'GenreAdventure', tmdbIds: [ 12 ] },
    { key: 'animation', label: 'GenreAnimation', tmdbIds: [ 16 ] },
    { key: 'comedy', label: 'GenreComedy', tmdbIds: [ 35 ] },
    { key: 'crime', label: 'GenreCrime', tmdbIds: [ 80 ] },
    { key: 'documentary', label: 'GenreDocumentary', tmdbIds: [ 99 ] },
    { key: 'drama', label: 'GenreDrama', tmdbIds: [ 18 ] },
    { key: 'family', label: 'GenreFamily', tmdbIds: [ 10751 ] },
    { key: 'kids', label: 'GenreKids', tmdbIds: [ 10762 ] },
    { key: 'fantasy', label: 'GenreFantasy', tmdbIds: [ 14 ] },
    { key: 'history', label: 'GenreHistory', tmdbIds: [ 36 ] },
    { key: 'horror', label: 'GenreHorror', tmdbIds: [ 27 ] },
    { key: 'mystery', label: 'GenreMystery', tmdbIds: [ 9648 ] },
    { key: 'romance', label: 'GenreRomance', tmdbIds: [ 10749 ] },
    { key: 'scifi', label: 'GenreScienceFiction', tmdbIds: [ 878, 10765 ] },
    { key: 'thriller', label: 'GenreThriller', tmdbIds: [ 53 ] },
    { key: 'war', label: 'GenreWar', tmdbIds: [ 10752, 10768 ] },
    { key: 'western', label: 'GenreWestern', tmdbIds: [ 37 ] },
    { key: 'reality', label: 'GenreReality', tmdbIds: [ 10764 ] },
    { key: 'talkshow', label: 'GenreTalkShow', tmdbIds: [ 10767 ] },
    { key: 'news', label: 'GenreNews', tmdbIds: [ 10763 ] },
    // Audiobooks only: TMDB has no such genre
    { key: 'biography', label: 'GenreBiography', tmdbIds: [] },
    { key: 'selfhelp', label: 'GenreSelfHelp', tmdbIds: [] },
    { key: 'classics', label: 'GenreClassics', tmdbIds: [] }
];

/** The genres turned off live with the display preferences of the user; every genre is on until then. */
export const HIDDEN_GENRES_SETTING = 'pufferfin-hidden-genres';

const KNOWN = new Set<string>(GENRE_PREFERENCES.map(genre => genre.key));

/** Reads the genres turned off; anything unreadable or unknown is left out, so everything shows. */
export function parseHiddenGenres(value: string | null | undefined): Set<GenreKey> {
    if (!value) return new Set();
    try {
        const parsed: unknown = JSON.parse(value);
        return new Set(Array.isArray(parsed) ? parsed.filter((key): key is GenreKey => typeof key === 'string' && KNOWN.has(key)) : []);
    } catch {
        return new Set();
    }
}

/** The TMDB genre ids of the genres turned off. */
export const getHiddenTmdbIds = (hidden: ReadonlySet<GenreKey>) =>
    new Set(GENRE_PREFERENCES.filter(genre => hidden.has(genre.key)).flatMap(genre => genre.tmdbIds));

/** Whether a catalog title is of a genre turned off. A title without genres, such as one on disk only, always shows. */
export const isOfHiddenGenre = (item: { GenreIds?: number[] | null }, hiddenIds: ReadonlySet<number>) =>
    !!hiddenIds.size && !!item.GenreIds?.some(id => hiddenIds.has(id));
