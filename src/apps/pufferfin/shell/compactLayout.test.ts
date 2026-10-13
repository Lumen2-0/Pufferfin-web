import { describe, expect, it } from 'vitest';

import { COMPACT_QUERY, isCompactLayout } from './compactLayout';

describe('isCompactLayout', () => {
    it('takes the bottom bar on a phone or an upright tablet', () => {
        expect(isCompactLayout(true, false)).toBe(true);
    });

    it('keeps the top bar on larger screens', () => {
        expect(isCompactLayout(false, false)).toBe(false);
    });

    it('keeps the top bar on a TV, whatever its size', () => {
        expect(isCompactLayout(true, true)).toBe(false);
    });

    it('covers phones and upright tablets, not tablets in landscape', () => {
        expect(COMPACT_QUERY).toContain('max-width: 47.99em');
        expect(COMPACT_QUERY).toContain('(max-width: 64em) and (orientation: portrait)');
    });
});
