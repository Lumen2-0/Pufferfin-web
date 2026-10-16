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
    getSeason,
    rankSeasonal,
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

    it('opens on the watch list, then what is being watched, then the tops', () => {
        for (const type of [ DiscoverType.All, DiscoverType.Movies, DiscoverType.Series ]) {
            expect(getDiscoverRows(type)[0]).toBe(DiscoverRow.Bookmarks);
            expect(getDiscoverRows(type)[1]).toBe(DiscoverRow.ContinueWatching);
            expect(getDiscoverRows(type)).not.toContain(DiscoverRow.NewOnServer);
        }
        expect(getDiscoverRows(DiscoverType.Movies)).not.toContain(DiscoverRow.TopShowsWeek);
        expect(getDiscoverRows(DiscoverType.Series)).not.toContain(DiscoverRow.TopMoviesWeek);
    });

    it('keeps the lists of every type sound', () => {
        for (const type of [ DiscoverType.All, DiscoverType.Movies, DiscoverType.Series ]) {
            expect(getDiscoverRows(type)).toContain(DiscoverRow.Bookmarks);
        }
        expect(getDiscoverRows(DiscoverType.TvShows)).toEqual([ DiscoverRow.LiveTvOnNow, DiscoverRow.Recordings ]);
        for (const type of DISCOVER_TYPES) {
            expect(getDiscoverRows(type)).not.toContain(DiscoverRow.AudiobookBestSellers);
        }
    });

    it('lists each row once on a screen', () => {
        for (const type of DISCOVER_TYPES) {
            const rows = getDiscoverRows(type);
            expect(new Set(rows).size).toBe(rows.length);
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

describe('getSeason', () => {
    it('shows each season only in its weeks', () => {
        expect(getSeason(new Date(2026, 9, 1))?.title).toBe('RowSeasonHalloween');
        expect(getSeason(new Date(2026, 9, 31))?.title).toBe('RowSeasonHalloween');
        expect(getSeason(new Date(2026, 11, 26))?.title).toBe('RowSeasonChristmas');
        expect(getSeason(new Date(2026, 1, 14))?.title).toBe('RowSeasonValentine');
        expect(getSeason(new Date(2026, 10, 1))).toBeUndefined();
        expect(getSeason(new Date(2026, 11, 27))).toBeUndefined();
    });

    it('puts the titles with the most genres of the theme first, films and series alternating', () => {
        const movies = [ { id: 'm1', GenreIds: [ 28 ] }, { id: 'm2', GenreIds: [ 35, 10751 ] }, { id: 'm3', GenreIds: [ 35 ] } ];
        const series = [ { id: 's1', GenreIds: null }, { id: 's2', GenreIds: [ 35 ] } ];
        expect(rankSeasonal([ movies, series ], [ 35, 10751 ]).map(item => item.id)).toEqual([ 'm2', 's2', 'm3', 's1', 'm1' ]);
    });
});
