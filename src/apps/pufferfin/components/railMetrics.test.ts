import { describe, expect, it } from 'vitest';

import { getRailState, getRailStep } from './railMetrics';

describe('getRailState', () => {
    it('shows only the next arrow at the start of a long row', () => {
        expect(getRailState({ scrollLeft: 0, scrollWidth: 2000, clientWidth: 1000 }))
            .toEqual({ canPrevious: false, canNext: true });
    });

    it('shows both arrows in the middle', () => {
        expect(getRailState({ scrollLeft: 400, scrollWidth: 2000, clientWidth: 1000 }))
            .toEqual({ canPrevious: true, canNext: true });
    });

    it('shows only the previous arrow at the end, despite rounding', () => {
        expect(getRailState({ scrollLeft: 999.5, scrollWidth: 2000, clientWidth: 1000 }))
            .toEqual({ canPrevious: true, canNext: false });
    });

    it('shows nothing when the row fits', () => {
        expect(getRailState({ scrollLeft: 0, scrollWidth: 800, clientWidth: 800 }))
            .toEqual({ canPrevious: false, canNext: false });
    });

    it('reads the negative scroll of a right-to-left row', () => {
        expect(getRailState({ scrollLeft: -400, scrollWidth: 2000, clientWidth: 1000 }))
            .toEqual({ canPrevious: true, canNext: true });
    });
});

describe('getRailStep', () => {
    it('moves most of the visible width', () => {
        expect(getRailStep(1000, 1, false)).toBe(850);
        expect(getRailStep(1000, -1, false)).toBe(-850);
    });

    it('turns the step around in a right-to-left row', () => {
        expect(getRailStep(1000, 1, true)).toBe(-850);
    });
});
