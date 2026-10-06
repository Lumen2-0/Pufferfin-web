import { describe, expect, it } from 'vitest';

import { type MediaRequest, RequestKind, RequestProblemCode, RequestState } from '../api/types';
import {
    findMovieRequest,
    getMoveIndex,
    getProgressPercent,
    isRequestActive,
    isRequestCancellable,
    isRequestStale,
    isSameId,
    REQUEST_STALE_MS,
    splitRequests,
    upsertRequest
} from './requests';
import { getCreateErrorLabel, getRequestProblemLabel, getRequestStateLabel } from './status';

const makeRequest = (overrides: Partial<MediaRequest> = {}): MediaRequest => ({
    Id: 'request',
    UserId: 'user',
    Kind: RequestKind.Movie,
    TmdbId: 603,
    Title: 'The Matrix',
    Language: 'fr',
    State: RequestState.Queued,
    CreatedAt: '2026-10-06T10:00:00Z',
    UpdatedAt: '2026-10-06T10:00:00Z',
    ...overrides
});

describe('Pufferfin: requests', () => {
    it('keeps listening only while a request moves on its own', () => {
        expect(isRequestActive(makeRequest({ State: RequestState.Downloading }))).toBe(true);
        expect(isRequestActive(makeRequest({ State: RequestState.WaitingForSources }))).toBe(true);
        expect(isRequestActive(makeRequest({ State: RequestState.Failed }))).toBe(false);
        expect(isRequestActive(makeRequest({ State: RequestState.Available }))).toBe(false);
    });

    it('lets a failed request be cancelled, not a finished one', () => {
        expect(isRequestCancellable(makeRequest({ State: RequestState.Failed }))).toBe(true);
        expect(isRequestCancellable(makeRequest({ State: RequestState.Available }))).toBe(false);
        expect(isRequestCancellable(makeRequest({ State: RequestState.Rejected }))).toBe(false);
    });

    it('adds a new request and replaces a known one in place', () => {
        const first = makeRequest({ Id: 'a' });
        const second = makeRequest({ Id: 'b' });
        const list = upsertRequest(upsertRequest(undefined, first), second);
        expect(list.map(item => item.Id)).toEqual([ 'a', 'b' ]);

        const moved = makeRequest({ Id: 'a', State: RequestState.Downloading, UpdatedAt: '2026-10-06T10:01:00Z' });
        expect(upsertRequest(list, moved)).toEqual([ moved, second ]);
    });

    it('ignores a late message older than the state it would replace', () => {
        const current = makeRequest({ State: RequestState.Importing, UpdatedAt: '2026-10-06T10:05:00Z' });
        const late = makeRequest({ State: RequestState.Downloading, UpdatedAt: '2026-10-06T10:04:00Z' });
        expect(upsertRequest([ current ], late)).toEqual([ current ]);
    });

    it('finds the request of a movie, the active one first, never a cancelled one', () => {
        const failedEarlier = makeRequest({ Id: 'failed', State: RequestState.Failed, UpdatedAt: '2026-10-06T09:00:00Z' });
        const cancelled = makeRequest({ Id: 'cancelled', State: RequestState.Cancelled, UpdatedAt: '2026-10-06T11:00:00Z' });
        const active = makeRequest({ Id: 'active', State: RequestState.Searching, UpdatedAt: '2026-10-06T08:00:00Z' });
        const otherMovie = makeRequest({ Id: 'other', TmdbId: 604, State: RequestState.Downloading });
        const season = makeRequest({ Id: 'season', Kind: RequestKind.Season, State: RequestState.Downloading });

        expect(findMovieRequest([ failedEarlier, cancelled, active, otherMovie, season ], 603)?.Id).toBe('active');
        expect(findMovieRequest([ failedEarlier, cancelled ], 603)?.Id).toBe('failed');
        expect(findMovieRequest([ cancelled ], 603)).toBeUndefined();
        expect(findMovieRequest(undefined, 603)).toBeUndefined();
    });

    it('turns the progress into a whole percentage within bounds', () => {
        expect(getProgressPercent(makeRequest({ Progress: 0.426 }))).toBe(43);
        expect(getProgressPercent(makeRequest({ Progress: 1.2 }))).toBe(100);
        expect(getProgressPercent(makeRequest({ Progress: null }))).toBe(0);
    });

    it('marks the state as old once no news came for a while', () => {
        expect(isRequestStale(0, REQUEST_STALE_MS)).toBe(false);
        expect(isRequestStale(0, REQUEST_STALE_MS + 1)).toBe(true);
    });

    it('labels every state, problem and refusal', () => {
        for (const state of Object.values(RequestState)) {
            expect(getRequestStateLabel(makeRequest({ State: state }))).toMatch(/^Request/);
        }
        for (const code of Object.values(RequestProblemCode)) {
            expect(getRequestProblemLabel(makeRequest({ Problem: { Code: code, Message: '' } }))).toBe(`RequestProblem${code}`);
        }
        expect(getRequestProblemLabel(makeRequest())).toBeUndefined();
        expect(getRequestProblemLabel(makeRequest({ Problem: { Code: 'Newer' as RequestProblemCode, Message: '' } })))
            .toBe('RequestProblemUnknown');

        expect(getCreateErrorLabel(403)).toBe('RequestErrorNotAllowed');
        expect(getCreateErrorLabel(429)).toBe('RequestErrorQuota');
        expect(getCreateErrorLabel(409)).toBe('RequestErrorServiceDisabled');
        expect(getCreateErrorLabel(undefined)).toBe('RequestErrorGeneric');
    });

    it('moves a waiting request one step among the waiting ones only', () => {
        const downloading = makeRequest({ Id: 'downloading', State: RequestState.Downloading });
        const pending = makeRequest({ Id: 'pending', State: RequestState.PendingApproval });
        const failed = makeRequest({ Id: 'failed', State: RequestState.Failed });
        const queued = makeRequest({ Id: 'queued', State: RequestState.Queued });
        const list = [ downloading, pending, failed, queued ];

        expect(getMoveIndex(list, 'queued', 'up')).toBe(0);
        expect(getMoveIndex(list, 'pending', 'down')).toBe(1);
        expect(getMoveIndex(list, 'pending', 'up')).toBeUndefined();
        expect(getMoveIndex(list, 'queued', 'down')).toBeUndefined();
        expect(getMoveIndex(list, 'downloading', 'up')).toBeUndefined();
    });

    it('splits the panel into current requests in queue order and finished ones, latest first', () => {
        const queued = makeRequest({ Id: 'queued', State: RequestState.Queued });
        const failed = makeRequest({ Id: 'failed', State: RequestState.Failed });
        const olderDone = makeRequest({ Id: 'older', State: RequestState.Available, UpdatedAt: '2026-10-05T10:00:00Z' });
        const newerDone = makeRequest({ Id: 'newer', State: RequestState.Cancelled, UpdatedAt: '2026-10-06T10:00:00Z' });

        const { current, finished } = splitRequests([ olderDone, queued, newerDone, failed ]);
        expect(current.map(item => item.Id)).toEqual([ 'queued', 'failed' ]);
        expect(finished.map(item => item.Id)).toEqual([ 'newer', 'older' ]);
        expect(splitRequests(undefined)).toEqual({ current: [], finished: [] });
    });

    it('compares user ids whatever their dashes and case', () => {
        expect(isSameId('0A1B2C3D-0000-0000-0000-000000000001', '0a1b2c3d000000000000000000000001')).toBe(true);
        expect(isSameId('a', 'b')).toBe(false);
        expect(isSameId(undefined, undefined)).toBe(false);
    });
});
