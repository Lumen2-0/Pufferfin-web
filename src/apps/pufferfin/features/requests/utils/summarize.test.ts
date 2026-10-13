import { describe, expect, it } from 'vitest';

import { type MediaRequest, RequestKind, RequestProblemCode, RequestState, TemporaryExpiryOutcome } from '../api/types';

import { isOver, summarizeRequests } from './requests';

const echo = (key: string, ...args: Array<string | number>) => [ key, ...args ].join(' ');

const request = (id: string, state: RequestState, progress?: number): MediaRequest => ({
    Id: id,
    UserId: 'u',
    Kind: RequestKind.Season,
    TmdbId: 1,
    Title: 'Series',
    Language: 'fr',
    State: state,
    Progress: progress,
    CreatedAt: '2026-10-08T00:00:00Z',
    UpdatedAt: '2026-10-08T00:00:00Z'
});

describe('summarizeRequests', () => {
    it('says nothing once every request is over or done', () => {
        expect(summarizeRequests([ request('a', RequestState.Cancelled), request('b', RequestState.Available) ], echo)).toBeUndefined();
    });

    it('averages the progress of the seasons still on their way', () => {
        const tag = summarizeRequests([
            request('a', RequestState.Downloading, 0.5),
            request('b', RequestState.Queued),
            request('c', RequestState.Available)
        ], echo);
        expect(tag).toEqual({ state: RequestState.Downloading, percent: 25, text: 'RequestDownloadingPercent 25', label: 'RequestDownloading' });
    });

    it('shows a failure first when nothing downloads', () => {
        const tag = summarizeRequests([ request('a', RequestState.Queued), request('b', RequestState.Failed) ], echo);
        expect(tag?.state).toBe(RequestState.Failed);
    });

    it('says a download is stalled for want of seeds instead of a progress at 0 %', () => {
        const stalled = { ...request('a', RequestState.Downloading, 0), Problem: { Code: RequestProblemCode.StalledNoSeeds, Message: 'stalled' } };
        expect(summarizeRequests([ stalled ], echo)).toEqual({ state: RequestState.Downloading, percent: 0, text: 'RequestStalledNoSeeds', label: 'RequestStalledNoSeeds', isStalled: true });
        expect(summarizeRequests([ stalled, { ...stalled, Id: 'b' } ], echo)?.isStalled).toBe(true);
    });

    it('drops a temporary film that already left the library, so it can be asked again', () => {
        const expired = { ...request('a', RequestState.Available), Temporary: true, ExpiryOutcome: TemporaryExpiryOutcome.Removed };
        expect(isOver(expired)).toBe(true);
        expect(summarizeRequests([ expired ], echo)).toBeUndefined();
    });
});
