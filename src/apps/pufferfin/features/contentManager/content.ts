import type { ContentCategory, ContentRow } from './types';

export type ContentFilter = 'all' | ContentCategory;
export type ContentSort = 'title' | 'size' | 'age' | 'ratio';

export const CONTENT_FILTERS: ContentFilter[] = [ 'all', 'Movie', 'Series', 'Anime', 'Documentary', 'Audiobook' ];
export const CONTENT_SORTS: ContentSort[] = [ 'title', 'size', 'age', 'ratio' ];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Lower case and without accents, so « Amélie » is found by « amelie ». */
export const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Whole days from a date to now; undefined without a date. */
export const daysSince = (date: string | null | undefined, now: number) => {
    if (!date) return undefined;
    const time = Date.parse(date);
    if (Number.isNaN(time)) return undefined;
    return Math.max(0, Math.floor((now - time) / DAY_MS));
};

/** Whole days left until a date, at least one while it is still ahead; undefined once passed or without a date. */
export const daysUntil = (date: string | null | undefined, now: number) => {
    if (!date) return undefined;
    const time = Date.parse(date);
    if (Number.isNaN(time) || time <= now) return undefined;
    return Math.max(1, Math.ceil((time - now) / DAY_MS));
};

// French writes octets: Mo, Go, To
const SIZE_UNITS: Record<string, string[]> = {
    fr: [ 'o', 'Ko', 'Mo', 'Go', 'To' ],
    en: [ 'B', 'KB', 'MB', 'GB', 'TB' ]
};

/** A size in the unit that reads best: « 812 Mo », « 4,2 Go », « 1,3 To ». */
export const formatSize = (bytes: number, locale: string) => {
    const units = SIZE_UNITS[locale.slice(0, 2).toLowerCase()] ?? SIZE_UNITS.en;
    let value = Math.max(0, bytes);
    let unit = 0;
    while (value >= 1000 && unit < units.length - 1) {
        value /= 1000;
        unit++;
    }
    const digits = value < 10 && unit > 0 ? 1 : 0;
    return `${value.toLocaleString(locale, { maximumFractionDigits: digits, minimumFractionDigits: digits })} ${units[unit]}`;
};

const compareText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });

/** The rows of the chosen library that match the search, in the chosen order. */
export function selectRows(rows: ContentRow[], filter: ContentFilter, search: string, sort: ContentSort): ContentRow[] {
    const query = normalize(search);
    const visible = rows.filter(row => (filter === 'all' || row.Category === filter)
        && (!query || normalize(row.Title).includes(query) || (row.Year !== undefined && row.Year !== null && String(row.Year).includes(query))));

    const byTitle = (a: ContentRow, b: ContentRow) => compareText(a.Title, b.Title);
    const sorters: Record<ContentSort, (a: ContentRow, b: ContentRow) => number> = {
        title: byTitle,
        // The biggest first
        size: (a, b) => b.SizeBytes - a.SizeBytes || byTitle(a, b),
        // The oldest torrent first; titles without one last
        age: (a, b) => (Date.parse(a.AddedAt ?? '') || Infinity) - (Date.parse(b.AddedAt ?? '') || Infinity) || byTitle(a, b),
        // The best ratio first; titles without one last
        ratio: (a, b) => (b.Ratio ?? -1) - (a.Ratio ?? -1) || byTitle(a, b)
    };
    return [ ...visible ].sort(sorters[sort]);
}

/** Whether a row has a torrent that must keep seeding: private or of unknown privacy, before its minimum. */
export const isProtected = (row: ContentRow, now: number) => daysUntil(row.ProtectedUntil, now) !== undefined;
