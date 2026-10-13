import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { describe, expect, it } from 'vitest';

import {
    DISCOVER_TYPE_LABELS,
    DISCOVER_TYPES,
    DiscoverRow,
    DiscoverType,
    DOCUMENTARY_GENRE_ID,
    TV_SHOW_TYPES,
    getDiscoverRows,
    getDiskItemTypes,
    hasFeatured,
    parseDiscoverType
} from './discover';
import enUs from '../../../strings/en-us.json';

describe('Pufferfin: Discover types', () => {
    it('reads the type of the address', () => {
        expect(parseDiscoverType('movies')).toBe(DiscoverType.Movies);
        // Books to read are no longer offered: an old address falls back to All
        expect(parseDiscoverType('books')).toBe(DiscoverType.All);
        expect(parseDiscoverType('documentaries')).toBe(DiscoverType.Documentaries);
    });

    it.each([ null, undefined, '', 'unknown' ])('falls back to All for %s', value => {
        expect(parseDiscoverType(value)).toBe(DiscoverType.All);
    });

    it('labels every type with a source string', () => {
        for (const type of Object.values(DiscoverType)) {
            expect(enUs).toHaveProperty(DISCOVER_TYPE_LABELS[type]);
        }
    });

    it('keeps above the genres only what is being watched, the bookmarks, and live TV', () => {
        expect(getDiscoverRows(DiscoverType.All)).toEqual([ DiscoverRow.ContinueWatching, DiscoverRow.Bookmarks ]);
        expect(getDiscoverRows(DiscoverType.TvShows)).toEqual([ DiscoverRow.LiveTvOnNow, DiscoverRow.Recordings ]);
        for (const type of DISCOVER_TYPES) {
            expect(getDiscoverRows(type)).not.toContain(DiscoverRow.TrendingMovies);
            expect(getDiscoverRows(type)).not.toContain(DiscoverRow.AudiobookBestSellers);
        }
    });

    it('is for discovering: no row lists what the library already holds', () => {
        for (const type of DISCOVER_TYPES) {
            expect(getDiscoverRows(type)).not.toContain('recentlyAdded');
        }
    });

    it('leaves audiobooks and documentaries to their genre rows', () => {
        expect(getDiscoverRows(DiscoverType.Audiobooks)).toEqual([]);
        expect(getDiscoverRows(DiscoverType.Documentaries)).toEqual([]);
    });

    it('shows no Next Up row: what to resume is enough', () => {
        for (const type of DISCOVER_TYPES) {
            expect(getDiscoverRows(type)).not.toContain('nextUp');
        }
    });

    it('opens on a featured title for the video types only', () => {
        expect(hasFeatured(DiscoverType.All)).toBe(true);
        expect(hasFeatured(DiscoverType.Movies)).toBe(true);
        expect(hasFeatured(DiscoverType.TvShows)).toBe(true);
        expect(hasFeatured(DiscoverType.Audiobooks)).toBe(false);
    });

    it('narrows the disk rows to the type', () => {
        expect(getDiskItemTypes(DiscoverType.All)).toBeUndefined();
        expect(getDiskItemTypes(DiscoverType.Movies)).toEqual([ BaseItemKind.Movie ]);
        expect(getDiskItemTypes(DiscoverType.Series)).toEqual([ BaseItemKind.Episode ]);
        expect(getDiskItemTypes(DiscoverType.Audiobooks)).toEqual([ BaseItemKind.AudioBook ]);
    });

    it('keeps fiction out of TV Shows', () => {
        expect(TV_SHOW_TYPES).not.toContain('Scripted');
    });

    it('offers documentaries by their TMDB genre', () => {
        expect(DISCOVER_TYPES).toContain(DiscoverType.Documentaries);
        expect(DOCUMENTARY_GENRE_ID).toBe(99);
    });
});
