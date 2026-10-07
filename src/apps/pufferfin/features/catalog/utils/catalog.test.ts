import { describe, expect, it } from 'vitest';

import { getCatalogTitlePath, getItemPath, parseCatalogTitleKind } from '../../../routes/paths';
import { CatalogAvailability, type CatalogItem, CatalogItemKind, CatalogSourceStatus } from '../api/types';
import { getCatalogItemPath, getCatalogListFailure, getOpenableItems, isMissing } from './catalog';

const missingMovie: CatalogItem = {
    Key: 'tmdb:movie:603',
    Kind: CatalogItemKind.Movie,
    Title: 'The Matrix',
    Availability: CatalogAvailability.Missing,
    TmdbId: 603
};

const seriesOnDisk: CatalogItem = {
    Key: 'tmdb:series:1399',
    Kind: CatalogItemKind.Series,
    Title: 'A Series',
    Availability: CatalogAvailability.OnDisk,
    LocalItemId: 'abc123',
    TmdbId: 1399
};

const audiobook: CatalogItem = {
    Key: 'audible:B0036NAKL0',
    Kind: CatalogItemKind.Audiobook,
    Title: 'A Book',
    Availability: CatalogAvailability.Missing
};

describe('Pufferfin: catalog helpers', () => {
    it('opens every title on the one title sheet: by library id when on disk, by TMDB id when missing', () => {
        expect(getCatalogItemPath(seriesOnDisk)).toBe(getItemPath('abc123'));
        expect(getCatalogItemPath(missingMovie)).toBe(getCatalogTitlePath(CatalogItemKind.Movie, 603));
        expect(getCatalogItemPath({ ...seriesOnDisk, Availability: CatalogAvailability.Missing, LocalItemId: null }))
            .toBe(getCatalogTitlePath(CatalogItemKind.Series, 1399));
    });

    it('opens a title on disk that TMDB does not know by its library id', () => {
        expect(getCatalogItemPath({ ...seriesOnDisk, TmdbId: null })).toBe(getItemPath('abc123'));
    });

    it('keeps only the entries with a screen to open', () => {
        expect(getCatalogItemPath(audiobook)).toBeUndefined();
        expect(getCatalogItemPath({ ...missingMovie, TmdbId: null })).toBeUndefined();
        expect(getOpenableItems([ missingMovie, audiobook, seriesOnDisk ])).toEqual([ missingMovie, seriesOnDisk ]);
        expect(getOpenableItems(undefined)).toBeUndefined();
    });

    it('tells missing entries apart', () => {
        expect(isMissing(missingMovie)).toBe(true);
        expect(isMissing(seriesOnDisk)).toBe(false);
    });

    it('reports a failed source only when it leaves the list empty', () => {
        const failed = { Source: 'Tmdb', Status: CatalogSourceStatus.Unavailable };
        expect(getCatalogListFailure({ Items: [], Sources: [ failed ] })).toEqual(failed);
        expect(getCatalogListFailure({ Items: [ missingMovie ], Sources: [ failed ] })).toBeUndefined();
    });

    it('treats a source that is not configured as an empty row, not a failure', () => {
        expect(getCatalogListFailure({
            Items: [],
            Sources: [ { Source: 'Letterboxd', Status: CatalogSourceStatus.Disabled } ]
        })).toBeUndefined();
        expect(getCatalogListFailure({
            Items: [],
            Sources: [ { Source: 'Tmdb', Status: CatalogSourceStatus.Ok } ]
        })).toBeUndefined();
    });

    it('round trips the kind of a catalog sheet path', () => {
        expect(getCatalogTitlePath(CatalogItemKind.Movie, 603)).toBe('/pufferfin/title/movie/603');
        expect(getCatalogTitlePath(CatalogItemKind.Series, 1399)).toBe('/pufferfin/title/series/1399');
        expect(parseCatalogTitleKind('movie')).toBe(CatalogItemKind.Movie);
        expect(parseCatalogTitleKind('series')).toBe(CatalogItemKind.Series);
        expect(parseCatalogTitleKind('person')).toBeUndefined();
        expect(parseCatalogTitleKind(undefined)).toBeUndefined();
    });
});
