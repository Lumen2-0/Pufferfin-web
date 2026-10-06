import { describe, expect, it } from 'vitest';

import { getNextPageStart, parseLibraryKind } from './library';

const page = (startIndex: number, count: number, totalCount: number) => ({
    items: Array.from({ length: count }),
    startIndex,
    totalCount
});

describe('Pufferfin: library helpers', () => {
    it('reads the shelf from the URL, movies by default', () => {
        expect(parseLibraryKind('shows')).toBe('shows');
        expect(parseLibraryKind('movies')).toBe('movies');
        expect(parseLibraryKind('audiobooks')).toBe('movies');
        expect(parseLibraryKind(null)).toBe('movies');
    });

    it('asks for the next page until every title is loaded', () => {
        expect(getNextPageStart(page(0, 60, 150))).toBe(60);
        expect(getNextPageStart(page(120, 30, 150))).toBeUndefined();
        expect(getNextPageStart(page(0, 60, 60))).toBeUndefined();
    });

    it('stops on an empty page even if the total says otherwise', () => {
        expect(getNextPageStart(page(60, 0, 150))).toBeUndefined();
    });
});
