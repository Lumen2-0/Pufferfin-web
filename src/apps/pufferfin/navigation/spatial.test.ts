import { describe, expect, it } from 'vitest';

import { findNextIndex, getDirection, type Rect } from './spatial';

const rect = (left: number, top: number, width = 100, height = 150): Rect => ({ left, top, width, height });

describe('Pufferfin: spatial navigation', () => {
    // Two rows of three cards, the second row scrolled by half a card
    const row1 = [ rect(0, 0), rect(120, 0), rect(240, 0) ];
    const row2 = [ rect(60, 200), rect(180, 200), rect(300, 200) ];
    const all = [ ...row1, ...row2 ];

    it('moves right to the adjacent card in the same row', () => {
        expect(findNextIndex(row1[0], all, 'right')).toBe(1);
    });

    it('moves left to the adjacent card in the same row', () => {
        expect(findNextIndex(row1[2], all, 'left')).toBe(1);
    });

    it('returns -1 at the edge of a row', () => {
        expect(findNextIndex(row1[0], all, 'left')).toBe(-1);
        expect(findNextIndex(row1[0], all, 'up')).toBe(-1);
    });

    it('moves down to the overlapping card with the closest center', () => {
        // Card at 120..220 overlaps 60..160 and 180..280, both centers are 60px away:
        // the first one found in DOM order wins the tie
        expect(findNextIndex(row1[1], all, 'down')).toBe(3);
        // Card at 240..340 overlaps 180..280 (center 230) and 300..400 (center 350)
        expect(findNextIndex(row1[2], all, 'down')).toBe(4);
    });

    it('moves up from a lower row', () => {
        expect(findNextIndex(row2[2], all, 'up')).toBe(2);
    });

    it('prefers an aligned candidate over a closer misaligned one', () => {
        const origin = rect(0, 0, 100, 50);
        const aligned = rect(0, 400, 100, 50);
        const nearButFarAside = rect(900, 60, 100, 50);
        expect(findNextIndex(origin, [ nearButFarAside, aligned ], 'down')).toBe(1);
    });

    it('ignores hidden candidates', () => {
        const hidden = rect(120, 0, 0, 0);
        expect(findNextIndex(row1[0], [ hidden, row1[2] ], 'right')).toBe(1);
    });

    it('maps key names to directions', () => {
        expect(getDirection('ArrowUp')).toBe('up');
        expect(getDirection('ArrowDown')).toBe('down');
        expect(getDirection('ArrowLeft')).toBe('left');
        expect(getDirection('ArrowRight')).toBe('right');
        expect(getDirection('Enter')).toBeUndefined();
    });
});
