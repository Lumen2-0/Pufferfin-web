import { describe, expect, it } from 'vitest';

import { daysSince, daysUntil, formatSize, isProtected, normalize, selectRows } from './content';
import type { ContentRow } from './types';

const NOW = Date.parse('2026-10-13T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();

const row = (title: string, extra: Partial<ContentRow> = {}): ContentRow => ({
    ItemId: title,
    Kind: 'Movie',
    Category: 'Movie',
    Title: title,
    Year: 2020,
    SizeBytes: 1_000,
    Torrents: [],
    Tracker: 'None',
    ...extra
});

describe('content manager', () => {
    const rows = [
        row('Dune', { SizeBytes: 9_000, AddedAt: ago(40), Ratio: 0.2 }),
        row('Amélie', { SizeBytes: 3_000, AddedAt: ago(5), Ratio: 2.1 }),
        row('Bones', { Kind: 'Series', Category: 'Series', SizeBytes: 50_000, AddedAt: ago(12), Ratio: 1 }),
        row('Paprika', { Category: 'Anime' })
    ];

    it('filters by library and finds a title without its accents', () => {
        expect(selectRows(rows, 'Series', '', 'title').map(r => r.Title)).toEqual([ 'Bones' ]);
        expect(selectRows(rows, 'all', 'amelie', 'title').map(r => r.Title)).toEqual([ 'Amélie' ]);
        expect(selectRows(rows, 'Anime', '', 'title').map(r => r.Title)).toEqual([ 'Paprika' ]);
        expect(normalize(' ÉTÉ ')).toBe('ete');
    });

    it('sorts by title, size, age and ratio, the titles without torrents last', () => {
        expect(selectRows(rows, 'all', '', 'title').map(r => r.Title)).toEqual([ 'Amélie', 'Bones', 'Dune', 'Paprika' ]);
        expect(selectRows(rows, 'all', '', 'size').map(r => r.Title)).toEqual([ 'Bones', 'Dune', 'Amélie', 'Paprika' ]);
        expect(selectRows(rows, 'all', '', 'age').map(r => r.Title)).toEqual([ 'Dune', 'Bones', 'Amélie', 'Paprika' ]);
        expect(selectRows(rows, 'all', '', 'ratio').map(r => r.Title)).toEqual([ 'Amélie', 'Bones', 'Dune', 'Paprika' ]);
    });

    it('counts the days since and until a date', () => {
        expect(daysSince(ago(3.5), NOW)).toBe(3);
        expect(daysSince(null, NOW)).toBeUndefined();
        expect(daysUntil(new Date(NOW + 2.2 * DAY).toISOString(), NOW)).toBe(3);
        expect(daysUntil(new Date(NOW + 60_000).toISOString(), NOW)).toBe(1);
        expect(daysUntil(ago(1), NOW)).toBeUndefined();
        expect(isProtected(row('X', { ProtectedUntil: new Date(NOW + DAY).toISOString() }), NOW)).toBe(true);
        expect(isProtected(row('X'), NOW)).toBe(false);
    });

    it('writes a size in the unit that reads best', () => {
        expect(formatSize(812_000_000, 'en')).toBe('812 MB');
        expect(formatSize(4_200_000_000, 'en')).toBe('4.2 GB');
        expect(formatSize(1_300_000_000_000, 'fr')).toBe('1,3 To');
    });
});
