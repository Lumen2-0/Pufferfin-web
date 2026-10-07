import { CatalogItemKind } from '../features/catalog/api/types';

/** Root path of the Pufferfin interface. */
export const PUFFERFIN_APP_PATH = 'pufferfin';

/** The Pufferfin home replaces the upstream home on the same path. */
export const HOME_APP_PATH = 'home';

/** Pufferfin home: titles on disk and catalog titles mixed. */
export const getHomePath = () => `/${HOME_APP_PATH}`;

export const isPufferfinPath = (pathname: string) =>
    pathname === getHomePath()
    || pathname === `/${PUFFERFIN_APP_PATH}`
    || pathname.startsWith(`/${PUFFERFIN_APP_PATH}/`);

export type CatalogTitleKind = CatalogItemKind.Movie | CatalogItemKind.Series;

/** Segment of the title sheet opened by the library id of the title: `title/item/{id}`. */
export const ITEM_SEGMENT = 'item';

/**
 * The one title sheet, opened by the library id of a title on disk. The same
 * sheet opens by TMDB id (`getCatalogTitlePath`): a title on disk shows Play
 * there too, a missing one Download.
 */
export const getItemPath = (itemId: string) => `/${PUFFERFIN_APP_PATH}/title/${ITEM_SEGMENT}/${itemId}`;

/** Former address of the sheet of a title on disk; it now redirects to `getItemPath`. */
export const LEGACY_ITEM_ROUTE = 'item/:itemId';

const MOVIE_SEGMENT = 'movie';
const SERIES_SEGMENT = 'series';
/** Audiobooks share the catalog sheet route: `title/audiobook/{asin}`. */
export const AUDIOBOOK_SEGMENT = 'audiobook';
/** Books to read too: `title/book/{provider}:{id}`, such as `title/book/openlibrary:OL82563W`. */
export const BOOK_SEGMENT = 'book';
const BOOK_ID_SEPARATOR = ':';
const BOOK_PROVIDER_PATTERN = /^[a-z]{2,20}$/;
const BOOK_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MARKET_PARAM = 'market';

/** The title sheet of a movie or a series by TMDB id, on disk or not: the server tells which. */
export const getCatalogTitlePath = (kind: CatalogTitleKind, tmdbId: number) =>
    `/${PUFFERFIN_APP_PATH}/title/${kind === CatalogItemKind.Series ? SERIES_SEGMENT : MOVIE_SEGMENT}/${tmdbId}`;

/** Catalog sheet of an audiobook, by Audible ASIN, read first in the market it was found in. */
export const getCatalogAudiobookPath = (asin: string, market?: string | null) => {
    const path = `/${PUFFERFIN_APP_PATH}/title/${AUDIOBOOK_SEGMENT}/${asin}`;
    return market ? `${path}?${MARKET_PARAM}=${encodeURIComponent(market)}` : path;
};

/** Catalog sheet of a book to read, by its metadata provider and its id there. */
export const getCatalogBookPath = (provider: string, bookId: string) =>
    `/${PUFFERFIN_APP_PATH}/title/${BOOK_SEGMENT}/${encodeURIComponent(provider + BOOK_ID_SEPARATOR + bookId)}`;

/** Reads the provider and the id of a book sheet path; undefined when they are not well formed. */
export function parseBookTarget(id: string): { provider: string, bookId: string } | undefined {
    const separator = id.indexOf(BOOK_ID_SEPARATOR);
    if (separator < 0) return undefined;
    const provider = id.slice(0, separator);
    const bookId = id.slice(separator + 1);
    return BOOK_PROVIDER_PATTERN.test(provider) && BOOK_ID_PATTERN.test(bookId) ? { provider, bookId } : undefined;
}

/** Reads the Audible market of an audiobook sheet path. */
export const getMarketParam = (searchParams: URLSearchParams) => searchParams.get(MARKET_PARAM) ?? undefined;

/** Reads the kind segment of a catalog sheet path; undefined when it names no known kind. */
export function parseCatalogTitleKind(segment: string | undefined): CatalogTitleKind | undefined {
    if (segment === MOVIE_SEGMENT) return CatalogItemKind.Movie;
    if (segment === SERIES_SEGMENT) return CatalogItemKind.Series;
    return undefined;
}

/** Library tab: only the titles on disk. */
export const getLibraryPath = () => `/${PUFFERFIN_APP_PATH}/library`;

/** One library of the server (Movies, Shows, Music...), its titles on disk. */
export const getLibraryViewPath = (viewId: string) => `${getLibraryPath()}/${viewId}`;

/** Downloads panel: every request on its way, then the latest finished ones. */
export const getDownloadsPath = () => `/${PUFFERFIN_APP_PATH}/downloads`;

/** Menu: account, administration and the other Jellyfin libraries. */
export const getMenuPath = () => `/${PUFFERFIN_APP_PATH}/menu`;

/** Universal search. */
export const getSearchPath = () => `/${PUFFERFIN_APP_PATH}/search`;

/** Person page: portrait, biography and filmography. */
export const getPersonPath = (personId: string) => `/${PUFFERFIN_APP_PATH}/person/${personId}`;

/** What a title sheet address points to. */
export type SheetTarget =
    | { kind: 'item', itemId: string }
    | { kind: 'catalog', titleKind: CatalogTitleKind, tmdbId: number }
    | { kind: 'audiobook', asin: string }
    | { kind: 'book', provider: string, bookId: string };

/**
 * Reads a title sheet address (`title/{segment}/{id}`): a library item, a
 * film or series by TMDB id, or an audiobook by ASIN. Undefined for an
 * address that names nothing.
 */
export function parseSheetTarget(segment: string | undefined, id: string | undefined, isAsin: (value: string) => boolean): SheetTarget | undefined {
    if (!segment || !id) return undefined;
    if (segment === ITEM_SEGMENT) return { kind: 'item', itemId: id };
    if (segment === AUDIOBOOK_SEGMENT) return isAsin(id) ? { kind: 'audiobook', asin: id } : undefined;
    if (segment === BOOK_SEGMENT) {
        const book = parseBookTarget(id);
        return book ? { kind: 'book', ...book } : undefined;
    }
    const titleKind = parseCatalogTitleKind(segment);
    const tmdbId = Number(id);
    if (!titleKind || !Number.isInteger(tmdbId) || tmdbId <= 0) return undefined;
    return { kind: 'catalog', titleKind, tmdbId };
}
