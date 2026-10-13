import { describe, expect, it } from 'vitest';

import { CatalogAvailability, type CatalogItem, CatalogItemKind } from '../../catalog/api/types';

import { getKindResults, getSpotlightSections, LIBRARY_SECTION_LIMIT, SECTION_LIMIT, SpotlightFilter } from './results';

let next = 0;
const entry = (kind: CatalogItemKind, onDisk = false): CatalogItem => {
    next++;
    return {
        Key: `k${next}`,
        Kind: kind,
        Title: `Title ${next}`,
        Availability: onDisk ? CatalogAvailability.OnDisk : CatalogAvailability.Missing,
        LocalItemId: onDisk ? `local${next}` : undefined,
        TmdbId: next,
        Asin: `asin${next}`
    };
};

const keysOf = (lines: { type: string, item?: CatalogItem }[]) =>
    lines.map(line => (line.type === 'result' ? line.item?.Key : 'more'));

describe('getSpotlightSections', () => {
    it('lists the titles on disk first, in the order of the search, then each kind without them', () => {
        const series = entry(CatalogItemKind.Series, true);
        const movieOnDisk = entry(CatalogItemKind.Movie, true);
        const movie = entry(CatalogItemKind.Movie);
        const sections = getSpotlightSections(SpotlightFilter.All, [ series, movieOnDisk, movie ], []);

        expect(sections.map(section => section.id)).toEqual([ 'library', 'movies', 'series', 'people', 'audiobooks' ]);
        expect(keysOf(sections[0].lines)).toEqual([ series.Key, movieOnDisk.Key ]);
        expect(keysOf(sections[1].lines)).toEqual([ movie.Key ]);
        expect(sections[2].lines).toEqual([]);
    });

    it('offers See all once a kind has more than its section shows', () => {
        const movies = Array.from({ length: SECTION_LIMIT + 2 }, () => entry(CatalogItemKind.Movie));
        const [ , moviesSection ] = getSpotlightSections(SpotlightFilter.All, movies, []);
        expect(moviesSection.lines).toHaveLength(SECTION_LIMIT + 1);
        expect(moviesSection.lines[SECTION_LIMIT]).toEqual({ type: 'more', filter: SpotlightFilter.Movies, count: movies.length });
    });

    it('keeps the library section short and points to the rest', () => {
        const onDisk = Array.from({ length: LIBRARY_SECTION_LIMIT + 1 }, () => entry(CatalogItemKind.Movie, true));
        const [ library, moviesSection ] = getSpotlightSections(SpotlightFilter.All, onDisk, []);
        expect(library.lines).toHaveLength(LIBRARY_SECTION_LIMIT);
        // The one left is not repeated, but the films section says there are more
        expect(keysOf(moviesSection.lines)).toEqual([ onDisk[LIBRARY_SECTION_LIMIT].Key ]);
    });

    it('lists one kind whole under a filter', () => {
        const movies = Array.from({ length: SECTION_LIMIT + 3 }, () => entry(CatalogItemKind.Movie, true));
        const sections = getSpotlightSections(SpotlightFilter.Movies, [ ...movies, entry(CatalogItemKind.Series) ], []);
        expect(sections).toHaveLength(1);
        expect(sections[0].lines).toHaveLength(movies.length);
    });

    it('reads audiobooks from their own search', () => {
        const book = entry(CatalogItemKind.Audiobook);
        const sections = getSpotlightSections(SpotlightFilter.Audiobooks, [], [ book ]);
        expect(sections[0]).toMatchObject({ source: 'audiobooks', lines: [ { type: 'result', item: book } ] });
    });

    it('does not list again under Films a title on disk, nor a homonym of the same year', () => {
        const onDisk: CatalogItem = { ...entry(CatalogItemKind.Movie, true), Title: 'Aftersun', Year: 2022 };
        const homonym: CatalogItem = { ...entry(CatalogItemKind.Movie), Title: 'Aftersun', Year: 2022 };
        const other: CatalogItem = { ...entry(CatalogItemKind.Movie), Title: 'Aftersun', Year: 2024 };
        const [ library, moviesSection ] = getSpotlightSections(SpotlightFilter.All, [ onDisk, homonym, other ], []);
        expect(keysOf(library.lines)).toEqual([ onDisk.Key ]);
        expect(keysOf(moviesSection.lines)).toEqual([ other.Key ]);
        // The Films filter still lists every one of them
        const [ films ] = getSpotlightSections(SpotlightFilter.Movies, [ onDisk, homonym, other ], []);
        expect(films.lines).toHaveLength(3);
    });
});

describe('getKindResults', () => {
    it('keeps a title once, the entry on disk winning at the place of the first', () => {
        const missing: CatalogItem = { ...entry(CatalogItemKind.Movie), TmdbId: 42 };
        const onDisk: CatalogItem = { ...entry(CatalogItemKind.Movie, true), TmdbId: 42 };
        expect(getKindResults([ missing, onDisk ], CatalogItemKind.Movie).map(item => item.Key)).toEqual([ onDisk.Key ]);
    });
});
