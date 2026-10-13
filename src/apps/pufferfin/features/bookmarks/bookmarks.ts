import type { CatalogTitleKind } from '../../routes/paths';

/** A title the user put aside to watch later: a film or a series, known by its TMDB id, on disk or not. */
export interface Bookmark {
    kind: CatalogTitleKind
    tmdbId: number
    title: string
    year?: number | null
    posterUrl?: string | null
}

/** The bookmarks live with the display preferences of the user, so they follow them from one device to another. */
export const BOOKMARKS_SETTING = 'pufferfin-bookmarks';

const isBookmark = (value: unknown): value is Bookmark => {
    const entry = value as Partial<Bookmark> | null;
    return !!entry && typeof entry.tmdbId === 'number' && typeof entry.kind === 'string' && typeof entry.title === 'string';
};

/** Reads the stored bookmarks, the last one added first; anything unreadable is left out. */
export function parseBookmarks(value: string | null | undefined): Bookmark[] {
    if (!value) return [];
    try {
        const parsed: unknown = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter(isBookmark) : [];
    } catch {
        return [];
    }
}

export const isSameBookmark = (a: Pick<Bookmark, 'kind' | 'tmdbId'>, b: Pick<Bookmark, 'kind' | 'tmdbId'>) => a.kind === b.kind && a.tmdbId === b.tmdbId;

/** Adds a title in front, or takes it out when it is there. */
export function toggleBookmark(bookmarks: Bookmark[], bookmark: Bookmark): Bookmark[] {
    return bookmarks.some(entry => isSameBookmark(entry, bookmark)) ?
        bookmarks.filter(entry => !isSameBookmark(entry, bookmark)) :
        [ bookmark, ...bookmarks ];
}
