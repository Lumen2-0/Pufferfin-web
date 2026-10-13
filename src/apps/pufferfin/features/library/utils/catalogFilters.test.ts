import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { describe, expect, it } from 'vitest';

import enUs from '../../../strings/en-us.json';
import fr from '../../../strings/fr.json';

import {
    getCountKeys,
    getDecades,
    getDecadeYears,
    LIBRARY_SORTS,
    LibrarySort,
    lowerFirst,
    parseCatalogFilters,
    SORT_LABELS,
    toItemsFilter,
    writeCatalogFilters
} from './catalogFilters';

const DEFAULTS = { sort: LibrarySort.TitleAsc, isUnplayed: false, query: '' };

describe('parseCatalogFilters', () => {
    it('falls back to the defaults', () => {
        expect(parseCatalogFilters(new URLSearchParams('sort=nope&decade=1995'))).toEqual({
            ...DEFAULTS, genreId: undefined, decade: undefined
        });
    });

    it('reads every filter and survives a round trip', () => {
        const filters = { sort: LibrarySort.YearDesc, genreId: 'g1', decade: 1990, isUnplayed: true, query: 'alien' };
        const params = writeCatalogFilters(new URLSearchParams('library=abc'), filters);
        expect(params.get('library')).toBe('abc');
        expect(parseCatalogFilters(params)).toEqual(filters);
    });

    it('leaves the defaults out of the address', () => {
        expect(writeCatalogFilters(new URLSearchParams('library=abc&sort=added'), DEFAULTS).toString()).toBe('library=abc');
    });
});

describe('decades', () => {
    it('groups years newest first', () => {
        expect(getDecades([ 1994, 2022, 1999, null, 2025, 0 ])).toEqual([ 2020, 1990 ]);
    });

    it('lists the years of a decade', () => {
        expect(getDecadeYears(1990)).toEqual([ 1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999 ]);
    });
});

describe('toItemsFilter', () => {
    it('sorts by name by default', () => {
        expect(toItemsFilter({ ...DEFAULTS }, false)).toEqual({
            sortBy: [ ItemSortBy.SortName ],
            sortOrder: SortOrder.Ascending,
            genreId: undefined,
            years: undefined,
            isUnplayed: undefined,
            searchTerm: undefined
        });
    });

    it('maps every order', () => {
        const order = (sort: LibrarySort) => {
            const filter = toItemsFilter({ ...DEFAULTS, sort }, false);
            return [ filter.sortBy?.[0], filter.sortOrder ];
        };
        expect(order(LibrarySort.TitleDesc)).toEqual([ ItemSortBy.SortName, SortOrder.Descending ]);
        expect(order(LibrarySort.YearDesc)).toEqual([ ItemSortBy.ProductionYear, SortOrder.Descending ]);
        expect(order(LibrarySort.YearAsc)).toEqual([ ItemSortBy.ProductionYear, SortOrder.Ascending ]);
        expect(order(LibrarySort.Added)).toEqual([ ItemSortBy.DateCreated, SortOrder.Descending ]);
        expect(order(LibrarySort.UnplayedFirst)).toEqual([ ItemSortBy.IsPlayed, SortOrder.Ascending ]);
    });

    it('passes the genre, the decade, unwatched and the trimmed text', () => {
        const filter = toItemsFilter({ ...DEFAULTS, genreId: 'g', decade: 2010, isUnplayed: true, query: ' dune ' }, false);
        expect(filter.genreId).toBe('g');
        expect(filter.years).toHaveLength(10);
        expect(filter.isUnplayed).toBe(true);
        expect(filter.searchTerm).toBe('dune');
    });

    it('keeps a book library to the orders of the books listing', () => {
        expect(toItemsFilter({ ...DEFAULTS, sort: LibrarySort.Added, genreId: 'g' }, true))
            .toEqual({ sortBy: [ ItemSortBy.DateCreated ], searchTerm: undefined });
        expect(toItemsFilter({ ...DEFAULTS }, true).sortBy).toBeUndefined();
    });
});

describe('labels', () => {
    it('has every string in English and French', () => {
        const keys = [
            ...LIBRARY_SORTS.map(sort => SORT_LABELS[sort]),
            ...[ [ BaseItemKind.Movie ], [ BaseItemKind.Series ], null ].flatMap(types => Object.values(getCountKeys(types)))
        ];
        for (const key of keys) {
            expect(enUs).toHaveProperty(key);
            expect(fr).toHaveProperty(key);
        }
    });

    it('counts films, series and other titles', () => {
        expect(getCountKeys([ BaseItemKind.Movie ]).count).toBe('LibraryCountMovies');
        expect(getCountKeys([ BaseItemKind.Series ]).count).toBe('LibraryCountSeries');
        expect(getCountKeys([ BaseItemKind.Movie, BaseItemKind.Series ]).count).toBe('LibraryCountTitles');
    });

    it('lowers the first letter only', () => {
        expect(lowerFirst('Titre A → Z')).toBe('titre A → Z');
    });
});
