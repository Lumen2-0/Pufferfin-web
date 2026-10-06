import { describe, expect, it } from 'vitest';

import { type MediaRequest, RequestKind, RequestState } from 'apps/pufferfin/api/types';

import { applyRequestUpdate, countWaiting, getRequestActions, getWaitingIndex } from './requests';

const request = (id: string, state: RequestState, overrides: Partial<MediaRequest> = {}): MediaRequest => ({
    Id: id,
    UserId: 'user',
    Kind: RequestKind.Movie,
    TmdbId: 1,
    Title: id,
    Language: 'fr',
    State: state,
    CreatedAt: '2026-10-06T10:00:00Z',
    UpdatedAt: '2026-10-06T10:00:00Z',
    ...overrides
});

describe('getRequestActions', () => {
    it('approves and refuses only a request waiting for approval', () => {
        expect(getRequestActions(request('a', RequestState.PendingApproval))).toMatchObject({
            canApprove: true,
            canReject: true,
            canMove: true,
            canCancel: true,
            canRetry: false
        });
        expect(getRequestActions(request('a', RequestState.Downloading))).toMatchObject({
            canApprove: false,
            canReject: false,
            canMove: false,
            canCancel: true
        });
    });

    it('retries only a failed request', () => {
        expect(getRequestActions(request('a', RequestState.Failed)).canRetry).toBe(true);
        expect(getRequestActions(request('a', RequestState.Queued)).canRetry).toBe(false);
    });

    it.each([ RequestState.Available, RequestState.Cancelled, RequestState.Rejected ])('cannot cancel a %s request', state => {
        expect(getRequestActions(request('a', state)).canCancel).toBe(false);
    });
});

describe('getWaitingIndex', () => {
    const queue = [
        request('downloading', RequestState.Downloading),
        request('pending', RequestState.PendingApproval),
        request('failed', RequestState.Failed),
        request('queued', RequestState.Queued)
    ];

    it('counts only the waiting requests, in list order', () => {
        expect(getWaitingIndex(queue, 'pending')).toBe(0);
        expect(getWaitingIndex(queue, 'queued')).toBe(1);
        expect(countWaiting(queue)).toBe(2);
    });

    it('returns -1 for a request that is not waiting', () => {
        expect(getWaitingIndex(queue, 'downloading')).toBe(-1);
    });
});

describe('applyRequestUpdate', () => {
    const downloading = request('a', RequestState.Downloading, { Progress: 0.2 });

    it('replaces the progress of a known request', () => {
        const update = { ...downloading, Progress: 0.5, UpdatedAt: '2026-10-06T10:01:00Z' };
        expect(applyRequestUpdate([ downloading ], update)).toEqual([ update ]);
    });

    it('asks for a refetch when the state changes or the request is unknown', () => {
        expect(applyRequestUpdate([ downloading ], { ...downloading, State: RequestState.Importing })).toBeUndefined();
        expect(applyRequestUpdate([ downloading ], request('b', RequestState.Queued))).toBeUndefined();
    });

    it('ignores a message older than the cached request', () => {
        const list = [ { ...downloading, UpdatedAt: '2026-10-06T10:05:00Z' } ];
        expect(applyRequestUpdate(list, { ...downloading, Progress: 0.1 })).toBe(list);
    });
});
