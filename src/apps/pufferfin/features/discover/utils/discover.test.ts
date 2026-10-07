import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { describe, expect, it } from 'vitest';

import {
    DISCOVER_TYPE_LABELS,
    DISCOVER_TYPES,
    DiscoverRow,
    DiscoverType,
    getDiscoverRows,
    getDiskItemTypes,
    hasFeatured,
    parseDiscoverType
} from './discover';
import enUs from '../../../strings/en-us.json';

describe('Pufferfin: Discover types', () => {
    it('reads the type of the address', () => {
        expect(parseDiscoverType('movies')).toBe(DiscoverType.Movies);
        expect(parseDiscoverType('books')).toBe(DiscoverType.Books);
    });

    it.each([ null, undefined, '', 'unknown', 'documentaries' ])('falls back to All for %s', value => {
        expect(parseDiscoverType(value)).toBe(DiscoverType.All);
    });

    it('labels every type with a source string', () => {
        for (const type of Object.values(DiscoverType)) {
            expect(enUs).toHaveProperty(DISCOVER_TYPE_LABELS[type]);
        }
    });

    it('gives every offered type at least one row', () => {
        for (const type of DISCOVER_TYPES) {
            expect(getDiscoverRows(type).length).toBeGreaterThan(0);
        }
    });

    it('mixes disk and catalog in All', () => {
        expect(getDiscoverRows(DiscoverType.All)).toEqual(expect.arrayContaining([
            DiscoverRow.ContinueWatching,
            DiscoverRow.TrendingMovies,
            DiscoverRow.TrendingShows,
            DiscoverRow.RecentlyAdded
        ]));
    });

    it('keeps the film recommendations out of Series and the series rows out of Movies', () => {
        expect(getDiscoverRows(DiscoverType.Series)).not.toContain(DiscoverRow.RecommendedForYou);
        expect(getDiscoverRows(DiscoverType.Movies)).not.toContain(DiscoverRow.NextUp);
        expect(getDiscoverRows(DiscoverType.Movies)).not.toContain(DiscoverRow.TrendingShows);
    });

    it('opens on a featured title for the video types only', () => {
        expect(hasFeatured(DiscoverType.All)).toBe(true);
        expect(hasFeatured(DiscoverType.Movies)).toBe(true);
        expect(hasFeatured(DiscoverType.Books)).toBe(false);
        expect(hasFeatured(DiscoverType.TvShows)).toBe(false);
    });

    it('narrows the disk rows to the type', () => {
        expect(getDiskItemTypes(DiscoverType.All)).toBeUndefined();
        expect(getDiskItemTypes(DiscoverType.Movies)).toEqual([ BaseItemKind.Movie ]);
        expect(getDiskItemTypes(DiscoverType.Series)).toEqual([ BaseItemKind.Episode ]);
        expect(getDiskItemTypes(DiscoverType.Audiobooks)).toEqual([ BaseItemKind.AudioBook ]);
    });
});
