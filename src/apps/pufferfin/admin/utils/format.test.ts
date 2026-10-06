import { describe, expect, it } from 'vitest';

import { formatBytes, formatDays, parseTimeSpanDays } from './format';

describe('formatBytes', () => {
    it.each([
        [ 0, '0 byte' ],
        [ 999, '999 byte' ],
        [ 1500, '1.5 kB' ],
        [ 2_000_000_000, '2 GB' ],
        [ 3_500_000_000_000, '3.5 TB' ]
    ])('formats %d bytes', (bytes, expected) => {
        expect(formatBytes(bytes, 'en-US')).toBe(expected);
    });

    it('never formats a negative size', () => {
        expect(formatBytes(-5, 'en-US')).toBe('0 byte');
    });
});

describe('formatDays', () => {
    it('keeps one decimal', () => {
        expect(formatDays(3.46, 'en-US')).toBe('3.5 days');
    });
});

describe('parseTimeSpanDays', () => {
    it.each([
        [ '1.12:00:00', 1.5 ],
        [ '12:00:00', 0.5 ],
        [ '14.00:00:00.1234567', 14 + (0.1234567 / 86400) ],
        [ '-1.00:00:00', -1 ]
    ])('reads %s', (timeSpan, expected) => {
        expect(parseTimeSpanDays(timeSpan)).toBeCloseTo(expected, 9);
    });

    it.each([ '', 'P1D', undefined, null ])('returns 0 for %s', timeSpan => {
        expect(parseTimeSpanDays(timeSpan)).toBe(0);
    });
});
