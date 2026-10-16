import type { StringKey } from '../../../i18n/translate';
import { type MediaRequest, RequestKind, RequestState } from '../api/types';

import { getRequestStateLabel, getRequestStateText, isRequestStalled } from './status';
import { isExpiredRequest } from './temporary';

type Translate = (key: StringKey, ...args: Array<string | number>) => string;

/** States after which nothing moves anymore. */
const FINAL_STATES = new Set<RequestState>([ RequestState.Available, RequestState.Cancelled, RequestState.Rejected ]);

/** Whether the request still moves on its own, so the client keeps listening for it. */
export const isRequestActive = (request: MediaRequest) =>
    !FINAL_STATES.has(request.State) && request.State !== RequestState.Failed;

/** Whether the owner may still cancel it. */
export const isRequestCancellable = (request: MediaRequest) => !FINAL_STATES.has(request.State);

/** Replaces the request with the same id, or adds it, keeping the queue order of the list. */
export function upsertRequest(requests: MediaRequest[] | undefined, request: MediaRequest): MediaRequest[] {
    const list = requests ?? [];
    const index = list.findIndex(item => item.Id === request.Id);
    if (index < 0) return [ ...list, request ];
    // A late message must not undo a newer state
    if (Date.parse(list[index].UpdatedAt) > Date.parse(request.UpdatedAt)) return list;
    const copy = list.slice();
    copy[index] = request;
    return copy;
}

/**
 * The request that speaks for a movie: the one still on its way, else the
 * latest one. Cancelled requests do not count: the movie can be asked again.
 */
export function findMovieRequest(requests: MediaRequest[] | undefined, tmdbId: number): MediaRequest | undefined {
    const candidates = (requests ?? [])
        .filter(request => request.Kind === RequestKind.Movie
            && request.TmdbId === tmdbId
            && request.State !== RequestState.Cancelled
            && !isExpiredRequest(request))
        .sort((a, b) => Date.parse(b.UpdatedAt) - Date.parse(a.UpdatedAt));
    return candidates.find(isRequestActive) ?? candidates[0];
}

/** Download progress as a whole percentage, clamped to 0 to 100. */
export const getProgressPercent = (request: MediaRequest) =>
    Math.round(Math.min(Math.max(request.Progress ?? 0, 0), 1) * 100);

/**
 * How long the last known state may sit without news before the screen says
 * so. The server pushes every change and the list is read again every
 * {@link REQUESTS_RESYNC_MS}, so beyond this the connection is the likely cause.
 */
export const REQUESTS_RESYNC_MS = 10000;
export const REQUEST_STALE_MS = 30000;

/** Whether the last news is too old to present a moving bar as live. */
export const isRequestStale = (lastSyncAt: number, now: number) => now - lastSyncAt > REQUEST_STALE_MS;

// The server writes ids without dashes, the SDK user may carry them
export const normalizeId = (id: string) => id.replace(/-/g, '').toLowerCase();

/** Whether two Jellyfin ids name the same user, whatever their formatting. */
export const isSameId = (a: string | undefined, b: string | undefined) => !!a && !!b && normalizeId(a) === normalizeId(b);

/** States in the queue an administrator can order: waiting for approval or for a slot. */
const isWaiting = (request: MediaRequest) =>
    request.State === RequestState.PendingApproval || request.State === RequestState.Queued;

export type MoveDirection = 'up' | 'down';

/**
 * The zero based place to send a waiting request to, one step up or down
 * among the waiting requests of the list, in the server's terms. Undefined
 * when it is not waiting or already at that end.
 */
export function getMoveIndex(requests: MediaRequest[], requestId: string, direction: MoveDirection): number | undefined {
    const waiting = requests.filter(isWaiting);
    const index = waiting.findIndex(request => request.Id === requestId);
    if (index < 0) return undefined;
    const target = direction === 'up' ? index - 1 : index + 1;
    return target >= 0 && target < waiting.length ? target : undefined;
}

/**
 * Splits a list for the downloads panel: what is still on its way or needs
 * attention (failed) in queue order, then what is finished, latest first.
 */
export function splitRequests(requests: MediaRequest[] | undefined) {
    const list = requests ?? [];
    const current = list.filter(request => isRequestActive(request) || request.State === RequestState.Failed);
    const finished = list
        .filter(request => !current.includes(request))
        .sort((a, b) => Date.parse(b.UpdatedAt) - Date.parse(a.UpdatedAt));
    return { current, finished };
}

/** The request that speaks for an audiobook, the same way as for a movie: active first, never a cancelled one. */
export function findAudiobookRequest(requests: MediaRequest[] | undefined, asin: string): MediaRequest | undefined {
    const candidates = (requests ?? [])
        .filter(request => request.Kind === RequestKind.Audiobook
            && request.Asin?.toUpperCase() === asin.toUpperCase()
            && request.State !== RequestState.Cancelled)
        .sort((a, b) => Date.parse(b.UpdatedAt) - Date.parse(a.UpdatedAt));
    return candidates.find(isRequestActive) ?? candidates[0];
}

/**
 * The requests of the seasons and the episodes of a series, the latest first,
 * without the cancelled ones: together they stand for the download of the series.
 */
export function findSeriesRequests(requests: MediaRequest[] | undefined, tmdbId: number): MediaRequest[] {
    return (requests ?? [])
        .filter(request => (request.Kind === RequestKind.Season || request.Kind === RequestKind.Episode)
            && request.TmdbId === tmdbId
            && request.State !== RequestState.Cancelled)
        .sort((a, b) => Date.parse(b.UpdatedAt) - Date.parse(a.UpdatedAt));
}

/** What a tag shows: one request, or several of one title (the seasons of a series) summed up. */
export interface DownloadTagState {
    state: RequestState
    /** 0 to 100 while downloading; undefined while the length of the wait is unknown. */
    percent?: number
    text: string
    /** The state alone in words, without the percentage, for a status that shows the percentage apart. */
    label?: string
    /** The time left of a single download, in seconds, when known. */
    etaSeconds?: number
    /** The speed of a single download, in bytes per second, when known. */
    bytesPerSecond?: number
    /** Stalled for want of seeds: the bar stands still and the words say why. */
    isStalled?: boolean
}

/** The tag of one request: its words, and its percentage while downloading. */
function getTagState(request: MediaRequest, t: Translate): DownloadTagState {
    return {
        state: request.State,
        percent: request.State === RequestState.Downloading ? getProgressPercent(request) : undefined,
        text: getRequestStateText(request, t),
        label: isRequestStalled(request) ? t('RequestStalledNoSeeds') : t(getRequestStateLabel(request)),
        etaSeconds: request.State === RequestState.Downloading ? request.EtaSeconds ?? undefined : undefined,
        bytesPerSecond: request.State === RequestState.Downloading && request.BytesPerSecond ? request.BytesPerSecond : undefined,
        isStalled: isRequestStalled(request)
    };
}

/** States in which a request no longer stands for the title: it may be asked again. */
export const isOver = (request: MediaRequest) =>
    request.State === RequestState.Cancelled || request.State === RequestState.Rejected || isExpiredRequest(request);

/**
 * Sums up the requests of one title in one tag: a movie has one, a series one
 * per season. While any downloads, the tag says so with the mean progress of
 * those still on their way.
 */
export function summarizeRequests(requests: MediaRequest[], t: Translate): DownloadTagState | undefined {
    const live = requests.filter(request => !isOver(request) && request.State !== RequestState.Available);
    if (!live.length) return undefined;
    if (live.length === 1) return getTagState(live[0], t);

    const downloading = live.filter(request => request.State === RequestState.Downloading);
    // Every download stalled: the series says so rather than a mean progress that does not move
    if (downloading.length && downloading.every(isRequestStalled)) {
        return { state: RequestState.Downloading, percent: 0, text: t('RequestStalledNoSeeds'), isStalled: true };
    }
    if (downloading.length) {
        const percent = Math.round(live.reduce((sum, request) => sum + getProgressPercent(request), 0) / live.length);
        return { state: RequestState.Downloading, percent, text: t('RequestDownloadingPercent', percent), label: t('RequestDownloading') };
    }
    const failed = live.find(request => request.State === RequestState.Failed);
    const first = failed ?? live[0];
    return { state: first.State, text: getRequestStateText(first, t), label: getRequestStateText(first, t) };
}
