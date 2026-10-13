import { describe, expect, it } from 'vitest';

import { CatalogItemKind } from '../catalog/api/types';
import { type Bookmark, parseBookmarks, toggleBookmark } from './bookmarks';

const dune: Bookmark = { kind: CatalogItemKind.Movie, tmdbId: 438631, title: 'Dune' };
const severance: Bookmark = { kind: CatalogItemKind.Series, tmdbId: 95396, title: 'Severance' };

describe('bookmarks', () => {
    it('puts the last title added first', () => {
        expect(toggleBookmark([ dune ], severance)).toEqual([ severance, dune ]);
    });

    it('takes a title out when it is already there', () => {
        expect(toggleBookmark([ severance, dune ], dune)).toEqual([ severance ]);
    });

    it('tells a film from a series with the same TMDB id', () => {
        const series = { ...dune, kind: CatalogItemKind.Series as const };
        expect(toggleBookmark([ dune ], series)).toEqual([ series, dune ]);
    });

    it('reads what was stored, and nothing from a broken value', () => {
        expect(parseBookmarks(JSON.stringify([ dune, { title: 'no id' } ]))).toEqual([ dune ]);
        expect(parseBookmarks('not json')).toEqual([]);
        expect(parseBookmarks(null)).toEqual([]);
        expect(parseBookmarks('{}')).toEqual([]);
    });
});
