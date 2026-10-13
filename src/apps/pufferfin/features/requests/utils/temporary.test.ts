import { describe, expect, it } from 'vitest';

import { type MediaRequest, RequestKind, RequestState, TemporaryExpiryOutcome } from '../api/types';
import { getDaysLeft, getShortEta, getTemporaryState, isExpiredRequest } from './temporary';

const NOW = Date.parse('2026-10-13T12:00:00Z');

const request = (changes: Partial<MediaRequest> = {}): MediaRequest => ({
    Id: 'r1',
    UserId: 'u1',
    Kind: RequestKind.Movie,
    TmdbId: 438631,
    Title: 'Dune',
    Language: 'fr',
    State: RequestState.Available,
    CreatedAt: '2026-10-10T12:00:00Z',
    UpdatedAt: '2026-10-13T12:00:00Z',
    Temporary: true,
    ExpiresAt: '2026-10-20T12:00:00Z',
    ...changes
});

describe('temporary films', () => {
    it('counts the days left, rounded up, never below zero', () => {
        expect(getDaysLeft('2026-10-20T12:00:00Z', NOW)).toBe(7);
        expect(getDaysLeft('2026-10-13T13:00:00Z', NOW)).toBe(1);
        expect(getDaysLeft('2026-10-12T12:00:00Z', NOW)).toBe(0);
    });

    it('tells pending, until a date, removed and kept apart', () => {
        expect(getTemporaryState(request({ State: RequestState.Downloading, ExpiresAt: null }), NOW)).toEqual({ kind: 'pending' });
        expect(getTemporaryState(request(), NOW)).toEqual({ kind: 'until', expiresAt: '2026-10-20T12:00:00Z', daysLeft: 7 });
        expect(getTemporaryState(request({ ExpiryOutcome: TemporaryExpiryOutcome.Removed }), NOW)).toEqual({ kind: 'removed' });
        expect(getTemporaryState(request({ ExpiryOutcome: TemporaryExpiryOutcome.Kept }), NOW)).toEqual({ kind: 'kept' });
    });

    it('says nothing for a film that stays', () => {
        expect(getTemporaryState(request({ Temporary: false }), NOW)).toBeUndefined();
        expect(getTemporaryState(undefined, NOW)).toBeUndefined();
        // Already there when asked: no expiry, it stays
        expect(getTemporaryState(request({ ExpiresAt: null }), NOW)).toBeUndefined();
    });

    it('drops an expired film from the title, so it can be asked again', () => {
        expect(isExpiredRequest(request({ ExpiryOutcome: TemporaryExpiryOutcome.Removed }))).toBe(true);
        expect(isExpiredRequest(request({ ExpiryOutcome: TemporaryExpiryOutcome.AlreadyGone }))).toBe(true);
        expect(isExpiredRequest(request({ ExpiryOutcome: TemporaryExpiryOutcome.Kept }))).toBe(false);
        expect(isExpiredRequest(request())).toBe(false);
    });

    it('words a short time left', () => {
        expect(getShortEta(undefined)).toBeUndefined();
        expect(getShortEta(30)).toEqual({ unit: 'under-minute' });
        expect(getShortEta(12 * 60)).toEqual({ unit: 'minutes', minutes: 12 });
        expect(getShortEta(125 * 60)).toEqual({ unit: 'hours', hours: 2, minutes: 5 });
    });
});
