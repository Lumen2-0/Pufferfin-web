import { describe, expect, it } from 'vitest';

import { getCatalogBookPath, parseBookTarget, parseSheetTarget } from './paths';

const isAsin = (value: string) => /^[A-Z0-9]{10}$/.test(value);

describe('Pufferfin: book sheet paths', () => {
    it('round-trips a book through its sheet path', () => {
        const path = getCatalogBookPath('openlibrary', 'OL82563W');
        expect(path).toBe('/pufferfin/title/book/openlibrary%3AOL82563W');
        const id = decodeURIComponent(path.split('/').pop() ?? '');
        expect(parseSheetTarget('book', id, isAsin)).toEqual({ kind: 'book', provider: 'openlibrary', bookId: 'OL82563W' });
    });

    it.each([ 'OL82563W', ':OL82563W', 'openlibrary:', 'Open Library:OL1W', 'openlibrary:../etc' ])('refuses %s', id => {
        expect(parseBookTarget(id)).toBeUndefined();
    });
});
