import { type MediaRequest, RequestKind, RequestState } from '../api/types';

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
            && request.State !== RequestState.Cancelled)
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
