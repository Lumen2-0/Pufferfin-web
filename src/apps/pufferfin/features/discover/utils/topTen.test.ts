import { describe, expect, it } from 'vitest';

import { CatalogAvailability, CatalogItemKind, type CatalogItem } from '../../catalog/api/types';
import { getMonthPhrase, selectTopTen } from './topTen';

const item = (key: string, withImage = true): CatalogItem => ({
    Key: key,
    Kind: CatalogItemKind.Movie,
    Title: key,
    ImageUrl: withImage ? `https://image.example/${key}.jpg` : null,
    Availability: CatalogAvailability.Missing
});

describe('Pufferfin: top rows', () => {
    it.each([
        [ 0, 'de janvier' ],
        [ 3, 'd’avril' ],
        [ 4, 'de mai' ],
        [ 7, 'd’août' ],
        [ 9, 'd’octobre' ],
        [ 11, 'de décembre' ]
    ])('elides the French month %i', (month, phrase) => {
        expect(getMonthPhrase('fr', new Date(2026, month, 15))).toBe(phrase);
        expect(getMonthPhrase('fr-CA', new Date(2026, month, 15))).toBe(phrase);
    });

    it('gives the bare month in English', () => {
        expect(getMonthPhrase('en-us', new Date(2026, 9, 15))).toBe('October');
        expect(getMonthPhrase(undefined, new Date(2026, 2, 1))).toBe('March');
    });

    it('ranks the first ten titles with a poster, each once', () => {
        const items = [
            item('a'), item('b', false), item('a'),
            ...Array.from({ length: 12 }, (_, index) => item(`t${index}`))
        ];
        const top = selectTopTen(items);
        expect(top).toHaveLength(10);
        expect(top[0].Key).toBe('a');
        expect(top.map(entry => entry.Key)).not.toContain('b');
        expect(new Set(top.map(entry => entry.Key)).size).toBe(10);
    });

    it('keeps a title on disk without a remote poster', () => {
        const local = { ...item('local', false), LocalItemId: 'abc' };
        expect(selectTopTen([ local ])).toEqual([ local ]);
    });

    it('is empty without titles', () => {
        expect(selectTopTen(undefined)).toEqual([]);
    });
});
