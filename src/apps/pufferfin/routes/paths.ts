import { CatalogItemKind } from '../features/catalog/api/types';

/** Root path of the Pufferfin interface. */
export const PUFFERFIN_APP_PATH = 'pufferfin';

export const isPufferfinPath = (pathname: string) =>
    pathname === `/${PUFFERFIN_APP_PATH}` || pathname.startsWith(`/${PUFFERFIN_APP_PATH}/`);

/** Detail page of a movie or a series. */
export const getItemPath = (itemId: string) => `/${PUFFERFIN_APP_PATH}/item/${itemId}`;

export type CatalogTitleKind = CatalogItemKind.Movie | CatalogItemKind.Series;

const MOVIE_SEGMENT = 'movie';
const SERIES_SEGMENT = 'series';

/** Catalog sheet of a movie or a series that is not in the library, by TMDB id. */
export const getCatalogTitlePath = (kind: CatalogTitleKind, tmdbId: number) =>
    `/${PUFFERFIN_APP_PATH}/title/${kind === CatalogItemKind.Series ? SERIES_SEGMENT : MOVIE_SEGMENT}/${tmdbId}`;

/** Reads the kind segment of a catalog sheet path; undefined when it names no known kind. */
export function parseCatalogTitleKind(segment: string | undefined): CatalogTitleKind | undefined {
    if (segment === MOVIE_SEGMENT) return CatalogItemKind.Movie;
    if (segment === SERIES_SEGMENT) return CatalogItemKind.Series;
    return undefined;
}

/** Universal search. */
export const getSearchPath = () => `/${PUFFERFIN_APP_PATH}/search`;

/** Person page: portrait, biography and filmography. */
export const getPersonPath = (personId: string) => `/${PUFFERFIN_APP_PATH}/person/${personId}`;
