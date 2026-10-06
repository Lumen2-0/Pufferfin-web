import { describe, expect, it } from 'vitest';

import { isSearchable, normalizeQuery } from './query';

describe('Pufferfin: search query', () => {
    it('trims and collapses whitespace', () => {
        expect(normalizeQuery('  the   dark\tknight ')).toBe('the dark knight');
    });

    it('needs at least two meaningful characters', () => {
        expect(isSearchable('a')).toBe(false);
        expect(isSearchable('  a  ')).toBe(false);
        expect(isSearchable('up')).toBe(true);
    });
});
