import { describe, expect, it } from 'vitest';

import { DiscoverType } from '../discover/utils/discover';
import { getThemePool, pickThemeRows } from '../discover/utils/themes';
import { GENRE_PREFERENCES, getHiddenTmdbIds, isOfHiddenGenre, parseHiddenGenres } from './genres';

describe('genre preferences', () => {
    it('shows every genre until the user unchecks some', () => {
        expect(parseHiddenGenres(null).size).toBe(0);
        expect(parseHiddenGenres('not json').size).toBe(0);
        expect([ ...parseHiddenGenres('["horror","nonsense",3]') ]).toEqual([ 'horror' ]);
    });

    it('offers every genre a Discover row is made of', () => {
        const known = new Set(GENRE_PREFERENCES.map(genre => genre.key));
        for (const row of getThemePool(DiscoverType.All, 2026)) {
            expect(known).toContain(row.genre);
        }
    });

    it('leaves the rows of an unchecked genre out of Discover', () => {
        const hidden = new Set([ 'horror', 'documentary' ]);
        for (const type of [ DiscoverType.All, DiscoverType.Movies, DiscoverType.Documentaries ]) {
            const rows = pickThemeRows(type, Date.UTC(2026, 9, 13), { hiddenGenres: hidden });
            expect(rows.some(row => hidden.has(row.genre))).toBe(false);
        }
        expect(pickThemeRows(DiscoverType.Documentaries, Date.UTC(2026, 9, 13), { hiddenGenres: hidden })).toEqual([]);
    });

    it('leaves out a title of an unchecked genre, the film and the series ids alike', () => {
        const ids = getHiddenTmdbIds(new Set([ 'scifi' ]));
        expect(isOfHiddenGenre({ GenreIds: [ 18, 878 ] }, ids)).toBe(true);
        expect(isOfHiddenGenre({ GenreIds: [ 10765 ] }, ids)).toBe(true);
        expect(isOfHiddenGenre({ GenreIds: [ 18 ] }, ids)).toBe(false);
        // Without genres, such as a title on disk only, it shows
        expect(isOfHiddenGenre({}, ids)).toBe(false);
    });
});
