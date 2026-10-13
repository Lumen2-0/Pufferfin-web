import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';

import type { StringKey } from '../../../i18n/translate';
import type { LibraryItemsFilter } from '../api/useLibraryItems';

/** The orders of the library grid, as the sort menu lists them. */
export enum LibrarySort {
    TitleAsc = 'title',
    TitleDesc = 'title-desc',
    YearDesc = 'year-desc',
    YearAsc = 'year',
    Added = 'added',
    UnplayedFirst = 'unplayed'
}

export const LIBRARY_SORTS: LibrarySort[] = [
    LibrarySort.TitleAsc,
    LibrarySort.TitleDesc,
    LibrarySort.YearDesc,
    LibrarySort.YearAsc,
    LibrarySort.Added,
    LibrarySort.UnplayedFirst
];

/** A library of books lists one entry per book, by name or newest first only. */
export const BOOK_SORTS: LibrarySort[] = [ LibrarySort.TitleAsc, LibrarySort.Added ];

export const SORT_LABELS: Record<LibrarySort, StringKey> = {
    [LibrarySort.TitleAsc]: 'LibrarySortTitleAsc',
    [LibrarySort.TitleDesc]: 'LibrarySortTitleDesc',
    [LibrarySort.YearDesc]: 'LibrarySortYearDesc',
    [LibrarySort.YearAsc]: 'LibrarySortYearAsc',
    [LibrarySort.Added]: 'LibrarySortAdded',
    [LibrarySort.UnplayedFirst]: 'LibrarySortUnplayedFirst'
};

/** What narrows the grid of a library, as kept in the address. */
export interface CatalogFilters {
    sort: LibrarySort
    genreId?: string
    /** First year of a decade, such as 1990 for the 1990s. */
    decade?: number
    isUnplayed: boolean
    query: string
}

/** The address parameters of the filters, next to `library`. */
export const FILTER_PARAMS = {
    sort: 'sort',
    genre: 'genre',
    decade: 'decade',
    unplayed: 'unplayed',
    query: 'q'
} as const;

const isSort = (value: string | null): value is LibrarySort =>
    !!value && (LIBRARY_SORTS as string[]).includes(value);

/** The filters read from the address; anything unknown falls back to the default. */
export function parseCatalogFilters(params: URLSearchParams): CatalogFilters {
    const sort = params.get(FILTER_PARAMS.sort);
    const decade = Number(params.get(FILTER_PARAMS.decade));
    return {
        sort: isSort(sort) ? sort : LibrarySort.TitleAsc,
        genreId: params.get(FILTER_PARAMS.genre) || undefined,
        decade: Number.isInteger(decade) && decade > 0 && decade % 10 === 0 ? decade : undefined,
        isUnplayed: params.get(FILTER_PARAMS.unplayed) === '1',
        query: params.get(FILTER_PARAMS.query) ?? ''
    };
}

/** Writes the filters into the address parameters, leaving out the defaults. */
export function writeCatalogFilters(params: URLSearchParams, filters: CatalogFilters): URLSearchParams {
    const next = new URLSearchParams(params);
    const set = (key: string, value: string | undefined) => {
        if (value) next.set(key, value);
        else next.delete(key);
    };
    set(FILTER_PARAMS.sort, filters.sort === LibrarySort.TitleAsc ? undefined : filters.sort);
    set(FILTER_PARAMS.genre, filters.genreId);
    set(FILTER_PARAMS.decade, filters.decade ? String(filters.decade) : undefined);
    set(FILTER_PARAMS.unplayed, filters.isUnplayed ? '1' : undefined);
    set(FILTER_PARAMS.query, filters.query || undefined);
    return next;
}

const DECADE_YEARS = 10;

/** The years of a decade, for the `years` parameter of the server. */
export function getDecadeYears(decade: number): number[] {
    return Array.from({ length: DECADE_YEARS }, (_, index) => decade + index);
}

/** The decades of a list of years, newest first, each once. */
export function getDecades(years: (number | null | undefined)[]): number[] {
    const decades = new Set<number>();
    for (const year of years) {
        if (year && year > 0) decades.add(Math.floor(year / DECADE_YEARS) * DECADE_YEARS);
    }
    return Array.from(decades).sort((a, b) => b - a);
}

/** The query of the server for the filters of the grid. */
export function toItemsFilter(filters: CatalogFilters, isBookLibrary: boolean): LibraryItemsFilter {
    const query = filters.query.trim();
    if (isBookLibrary) {
        // The books come grouped from the Pufferfin listing: newest first or by name, nothing else
        return {
            sortBy: filters.sort === LibrarySort.Added ? [ ItemSortBy.DateCreated ] : undefined,
            searchTerm: query || undefined
        };
    }

    let sortBy: ItemSortBy[];
    let sortOrder: SortOrder;
    switch (filters.sort) {
        case LibrarySort.TitleDesc:
            sortBy = [ ItemSortBy.SortName ];
            sortOrder = SortOrder.Descending;
            break;
        case LibrarySort.YearDesc:
            sortBy = [ ItemSortBy.ProductionYear, ItemSortBy.PremiereDate, ItemSortBy.SortName ];
            sortOrder = SortOrder.Descending;
            break;
        case LibrarySort.YearAsc:
            sortBy = [ ItemSortBy.ProductionYear, ItemSortBy.PremiereDate, ItemSortBy.SortName ];
            sortOrder = SortOrder.Ascending;
            break;
        case LibrarySort.Added:
            sortBy = [ ItemSortBy.DateCreated, ItemSortBy.SortName ];
            sortOrder = SortOrder.Descending;
            break;
        case LibrarySort.UnplayedFirst:
            // Not played sorts before played: the titles still to watch come first
            sortBy = [ ItemSortBy.IsPlayed, ItemSortBy.SortName ];
            sortOrder = SortOrder.Ascending;
            break;
        default:
            sortBy = [ ItemSortBy.SortName ];
            sortOrder = SortOrder.Ascending;
    }

    return {
        sortBy,
        sortOrder,
        genreId: filters.genreId,
        years: filters.decade ? getDecadeYears(filters.decade) : undefined,
        isUnplayed: filters.isUnplayed || undefined,
        searchTerm: query || undefined
    };
}

/** The words for a count of titles: films for films, series for series, titles for the rest. */
export function getCountKeys(itemTypes: BaseItemKind[] | null): { count: StringKey, one: StringKey, progress: StringKey } {
    if (itemTypes?.length === 1 && itemTypes[0] === BaseItemKind.Movie) {
        return { count: 'LibraryCountMovies', one: 'LibraryCountMovie', progress: 'LibraryProgressMovies' };
    }
    if (itemTypes?.length === 1 && itemTypes[0] === BaseItemKind.Series) {
        return { count: 'LibraryCountSeries', one: 'LibraryCountSerie', progress: 'LibraryProgressSeries' };
    }
    return { count: 'LibraryCountTitles', one: 'LibraryCountTitle', progress: 'LibraryProgressTitles' };
}

/** "Titre A → Z" read inside "Trier : titre A → Z". */
export function lowerFirst(text: string): string {
    return text.charAt(0).toLocaleLowerCase() + text.slice(1);
}
