import { type MediaRequest, RequestState } from 'apps/pufferfin/api/types';

/** States in which a request waits in the queue, whose order an administrator can change. */
const WAITING_STATES = new Set([ RequestState.PendingApproval, RequestState.Queued ]);

/** States after which nothing more happens to a request. */
const FINISHED_STATES = new Set([ RequestState.Available, RequestState.Cancelled, RequestState.Rejected ]);

export const isWaiting = (mediaRequest: MediaRequest) => WAITING_STATES.has(mediaRequest.State);

/** What an administrator can do with a request, following the transitions the server accepts. */
export const getRequestActions = (mediaRequest: MediaRequest) => ({
    canApprove: mediaRequest.State === RequestState.PendingApproval,
    canReject: mediaRequest.State === RequestState.PendingApproval,
    canRetry: mediaRequest.State === RequestState.Failed,
    canCancel: !FINISHED_STATES.has(mediaRequest.State),
    canMove: isWaiting(mediaRequest)
});

/**
 * The zero based place of a request among the waiting ones, which is the index the server expects to move it.
 * The list comes from the server in queue order. Returns -1 when the request is not waiting.
 */
export const getWaitingIndex = (requests: MediaRequest[], requestId: string) => (
    requests.filter(isWaiting).findIndex(mediaRequest => mediaRequest.Id === requestId)
);

export const countWaiting = (requests: MediaRequest[]) => requests.filter(isWaiting).length;

/**
 * Applies a request pushed by the server to the cached list.
 * Returns `undefined` when the list must be fetched again: an unknown request, or a change of state, which can
 * move other requests in the queue.
 */
export const applyRequestUpdate = (requests: MediaRequest[], update: MediaRequest): MediaRequest[] | undefined => {
    const index = requests.findIndex(mediaRequest => mediaRequest.Id === update.Id);
    if (index < 0 || requests[index].State !== update.State) return undefined;

    // A late message must not undo a newer state.
    if (Date.parse(update.UpdatedAt) < Date.parse(requests[index].UpdatedAt)) return requests;

    const next = [ ...requests ];
    next[index] = update;
    return next;
};
