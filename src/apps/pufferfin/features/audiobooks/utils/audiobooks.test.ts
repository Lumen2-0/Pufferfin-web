import { describe, expect, it } from 'vitest';

import { getCatalogAudiobookPath } from '../../../routes/paths';
import { CatalogAvailability, type CatalogAudiobookDetails, type CatalogItem, CatalogItemKind } from '../../catalog/api/types';
import { getCatalogItemPath } from '../../catalog/utils/catalog';
import { type MediaRequest, RequestKind, RequestProblemCode, RequestState } from '../../requests/api/types';
import { findAudiobookRequest } from '../../requests/utils/requests';
import { getRequestProblemLabel, getRequestTitlePath } from '../../requests/utils/status';
import { getAudiobookCaption, getAudiobookMeta, getPartTitle, isAsin } from './audiobooks';

const echo = (key: string, ...args: Array<string | number>) => [ key, ...args ].join(' ');

const book: CatalogAudiobookDetails = {
    Asin: 'B0ABCDEFGH',
    Title: 'The Book',
    Authors: [ 'An Author' ],
    Narrators: [],
    Market: 'fr',
    IsCompleteEdition: false,
    Year: 2021,
    RuntimeMinutes: 754,
    Availability: CatalogAvailability.Missing
};

const item: CatalogItem = {
    Key: 'audible:B0ABCDEFGH',
    Kind: CatalogItemKind.Audiobook,
    Title: 'The Book',
    Availability: CatalogAvailability.Missing,
    Asin: 'B0ABCDEFGH',
    Market: 'fr',
    Authors: [ 'An Author', 'Another' ]
};

const makeRequest = (overrides: Partial<MediaRequest> = {}): MediaRequest => ({
    Id: 'request',
    UserId: 'user',
    Kind: RequestKind.Audiobook,
    TmdbId: 0,
    Asin: 'B0ABCDEFGH',
    Title: 'The Book',
    Language: 'fr',
    State: RequestState.Searching,
    CreatedAt: '2026-10-06T10:00:00Z',
    UpdatedAt: '2026-10-06T10:00:00Z',
    ...overrides
});

describe('Pufferfin: audiobooks', () => {
    it('opens audiobooks on the catalog sheet route, on disk or not', () => {
        expect(getCatalogItemPath(item)).toBe('/pufferfin/title/audiobook/B0ABCDEFGH?market=fr');
        expect(getCatalogItemPath({ ...item, Availability: CatalogAvailability.OnDisk, LocalItemId: 'local' }))
            .toBe('/pufferfin/title/audiobook/B0ABCDEFGH?market=fr');
        expect(getCatalogItemPath({ ...item, Asin: null })).toBeUndefined();
        expect(getCatalogAudiobookPath('B0ABCDEFGH')).toBe('/pufferfin/title/audiobook/B0ABCDEFGH');
    });

    it('accepts only ten letters and digits as an ASIN', () => {
        expect(isAsin('B0ABCDEFGH')).toBe(true);
        expect(isAsin('B0ABCDEFG')).toBe(false);
        expect(isAsin('B0ABCDEF/H')).toBe(false);
        expect(isAsin(undefined)).toBe(false);
    });

    it('says a complete edition in words, on the card and on the sheet', () => {
        expect(getAudiobookCaption(item, echo)).toBe('An Author');
        expect(getAudiobookCaption({ ...item, IsCompleteEdition: true }, echo)).toBe('An Author, AudiobookCompleteEdition');
        expect(getAudiobookMeta(book, echo)).toEqual([ '2021', 'DurationHoursMinutes 12 34' ]);
        expect(getAudiobookMeta({ ...book, IsCompleteEdition: true }, echo)).toContain('AudiobookCompleteEdition');
    });

    it('finds the request of a book by ASIN, active first, never a cancelled one', () => {
        const failed = makeRequest({ Id: 'failed', State: RequestState.Failed, UpdatedAt: '2026-10-06T12:00:00Z' });
        const active = makeRequest({ Id: 'active', Asin: 'b0abcdefgh' });
        const cancelled = makeRequest({ Id: 'cancelled', State: RequestState.Cancelled });
        const movie = makeRequest({ Id: 'movie', Kind: RequestKind.Movie, Asin: null });
        expect(findAudiobookRequest([ failed, active, cancelled, movie ], 'B0ABCDEFGH')?.Id).toBe('active');
        expect(findAudiobookRequest([ failed, cancelled ], 'B0ABCDEFGH')?.Id).toBe('failed');
        expect(findAudiobookRequest([ cancelled ], 'B0ABCDEFGH')).toBeUndefined();
    });

    it('translates a volume found only inside a complete edition', () => {
        const request = makeRequest({ State: RequestState.Failed, Problem: { Code: RequestProblemCode.OnlyCompleteEditions, Message: '' } });
        expect(getRequestProblemLabel(request)).toBe('RequestProblemOnlyCompleteEditions');
    });

    it('opens the sheet of the title a request is about', () => {
        expect(getRequestTitlePath(makeRequest())).toBe('/pufferfin/title/audiobook/B0ABCDEFGH');
        expect(getRequestTitlePath(makeRequest({ Asin: null }))).toBeUndefined();
        expect(getRequestTitlePath(makeRequest({ Kind: RequestKind.Movie, TmdbId: 603 }))).toBe('/pufferfin/title/movie/603');
        expect(getRequestTitlePath(makeRequest({ Kind: RequestKind.Episode, TmdbId: 1399 }))).toBe('/pufferfin/title/series/1399');
    });
});

describe('getPartTitle', () => {
    it('drops the name of the book in front of the part', () => {
        expect(getPartTitle('Dune - Partie 03', 'Dune', 2)).toBe('Partie 03');
        expect(getPartTitle('dune_Part 1', 'Dune', 0)).toBe('Part 1');
    });

    it('keeps a name that does not start with the book', () => {
        expect(getPartTitle('Chapitre 1', 'Dune', 0)).toBe('Chapitre 1');
    });

    it('falls back on the number when nothing is left', () => {
        expect(getPartTitle('Dune', 'Dune', 4)).toBe('Dune');
        expect(getPartTitle('', 'Dune', 4)).toBe('5');
    });
});
