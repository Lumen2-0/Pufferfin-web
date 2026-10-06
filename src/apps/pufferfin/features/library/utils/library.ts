/** The two shelves of the library tab. */
export type LibraryKind = 'movies' | 'shows';

export const LIBRARY_KINDS: LibraryKind[] = [ 'movies', 'shows' ];

/** Enough titles to fill a TV screen a few times over without a slow first load. */
export const LIBRARY_PAGE_SIZE = 60;

/** Reads the shelf from the URL; anything unknown falls back to movies. */
export function parseLibraryKind(value: string | null | undefined): LibraryKind {
    return value === 'shows' ? 'shows' : 'movies';
}

interface LibraryPage {
    items: unknown[]
    startIndex: number
    totalCount: number
}

/** Start index of the next page, or undefined once every title is loaded or a page comes back empty. */
export function getNextPageStart(lastPage: LibraryPage): number | undefined {
    const next = lastPage.startIndex + lastPage.items.length;
    if (lastPage.items.length === 0 || next >= lastPage.totalCount) return undefined;
    return next;
}
