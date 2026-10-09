import { describe, expect, it } from 'vitest';

import { parseSheetTarget } from './paths';

const isAsin = (value: string) => /^[A-Z0-9]{10}$/.test(value);

describe('Pufferfin: sheet paths', () => {
    it('reads a film, an audiobook and a library item', () => {
        expect(parseSheetTarget('movie', '603', isAsin)).toEqual({ kind: 'catalog', titleKind: 'Movie', tmdbId: 603 });
        expect(parseSheetTarget('audiobook', 'B00LHPNBC6', isAsin)).toEqual({ kind: 'audiobook', asin: 'B00LHPNBC6' });
        expect(parseSheetTarget('item', 'abc', isAsin)).toEqual({ kind: 'item', itemId: 'abc' });
    });

    it('names nothing for a book to read: they are no longer offered', () => {
        expect(parseSheetTarget('book', 'openlibrary:OL82563W', isAsin)).toBeUndefined();
    });
});
