import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';

import { DeletionMode, DeletionStatus, TorrentAction } from 'apps/pufferfin/api/types';

import { countKeptUntilMinimum, getDeletionFailure } from './deletion';

const httpError = (status: number, data?: unknown) => {
    const config = { headers: new AxiosHeaders() };
    return new AxiosError('failed', String(status), config, undefined, {
        status,
        statusText: '',
        headers: {},
        config,
        data
    });
};

describe('getDeletionFailure', () => {
    it('reads the outcome of an unconfirmed immediate deletion', () => {
        expect(getDeletionFailure(httpError(409, { Status: 'ConfirmationRequired', Message: 'm' })))
            .toBe(DeletionStatus.ConfirmationRequired);
    });

    it('reads the title of a problem', () => {
        expect(getDeletionFailure(httpError(409, { title: 'ServiceDisabled', detail: 'd' })))
            .toBe(DeletionStatus.ServiceDisabled);
    });

    it.each([
        [ 403, DeletionStatus.Forbidden ],
        [ 404, DeletionStatus.NotFound ],
        [ 503, DeletionStatus.ServiceUnavailable ]
    ])('falls back on the HTTP status %d', (status, expected) => {
        expect(getDeletionFailure(httpError(status))).toBe(expected);
    });

    it('does not describe a network error', () => {
        expect(getDeletionFailure(new Error('offline'))).toBeUndefined();
        expect(getDeletionFailure(httpError(500))).toBeUndefined();
    });
});

describe('countKeptUntilMinimum', () => {
    it('counts the torrents waiting for release', () => {
        const torrent = (action: TorrentAction) => ({ Hash: action, Name: action, SeedingTime: '1.00:00:00', Action: action });
        expect(countKeptUntilMinimum({
            Status: DeletionStatus.Deleted,
            Message: 'm',
            Plan: {
                Title: { ItemId: 'id', Title: 't' },
                Mode: DeletionMode.Safe,
                Torrents: [
                    torrent(TorrentAction.KeepUntilMinimum),
                    torrent(TorrentAction.RemoveNow),
                    torrent(TorrentAction.KeepShared)
                ],
                PrivateBeforeMinimum: 1
            }
        })).toBe(1);
        expect(countKeptUntilMinimum(undefined)).toBe(0);
    });
});
