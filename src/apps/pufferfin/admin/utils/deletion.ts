import { isAxiosError } from 'axios';

import { type DeletionOutcome, DeletionStatus, TorrentAction } from 'apps/pufferfin/api/types';

const STATUS_BY_HTTP_CODE: Record<number, DeletionStatus> = {
    403: DeletionStatus.Forbidden,
    404: DeletionStatus.NotFound,
    503: DeletionStatus.ServiceUnavailable
};

const isDeletionStatus = (value: unknown): value is DeletionStatus => (
    Object.values(DeletionStatus).includes(value as DeletionStatus)
);

/**
 * Why a deletion or its preview failed. A 409 is either the immediate mode without its confirmation (the body is
 * the outcome) or a disabled service (the body is a problem whose title is the status). Returns `undefined` when
 * the failure is not one the server describes, such as a network error.
 */
export const getDeletionFailure = (error: unknown): DeletionStatus | undefined => {
    if (!isAxiosError<Partial<DeletionOutcome> & { title?: string }>(error) || !error.response) return undefined;

    const { status, data } = error.response;
    if (isDeletionStatus(data?.Status)) return data.Status;
    if (isDeletionStatus(data?.title)) return data.title;

    return STATUS_BY_HTTP_CODE[status];
};

/** The number of torrents that keep seeding, waiting for release, after the deletion. */
export const countKeptUntilMinimum = (outcome: DeletionOutcome | undefined) => (
    outcome?.Plan?.Torrents.filter(torrent => torrent.Action === TorrentAction.KeepUntilMinimum).length ?? 0
);
