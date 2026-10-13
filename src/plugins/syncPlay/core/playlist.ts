// PUFFERFIN: pure helpers that keep the play queue of a SyncPlay group in
// step with what each client plays, so that nobody starts another title.

/** An entry of the play queue of the group, as the server sends it. */
export interface QueueEntry {
    ItemId: string
    PlaylistItemId: string
}

/** A library item, as far as the play queue needs it. */
export interface PlaylistItem {
    Id?: string | null
    PlaylistItemId?: string
    [key: string]: unknown
}

/**
 * The items of the group queue in the queue order, each with its playlist id.
 *
 * The server answers a list of ids in its own order, may leave out an item
 * the user cannot see anymore, and lists an item once even when the queue
 * holds it twice. Matching by position, as upstream did, then gave an item the
 * playlist id of another one, and the group played the wrong title. Here each
 * entry finds its item by id; a missing one keeps its place with only its id,
 * so the playing index still points at the right entry.
 */
export function orderPlaylistItems<T extends PlaylistItem>(queue: QueueEntry[], items: T[], serverId?: string): Array<T & { PlaylistItemId: string }> {
    const byId = new Map<string, T>();
    for (const item of items) {
        if (item.Id && !byId.has(item.Id)) byId.set(item.Id, item);
    }

    return queue.map(entry => {
        const item = byId.get(entry.ItemId);
        const base = item ?? ({ Id: entry.ItemId, ServerId: serverId } as unknown as T);
        // A copy: the same title twice in the queue keeps two playlist ids
        return { ...base, PlaylistItemId: entry.PlaylistItemId };
    });
}

/**
 * Where the group queue starts: on the title the user chose.
 *
 * Expanding a choice into a queue (the episodes after an episode, the files of
 * a folder) can move the chosen title. When the requested position does not
 * hold it, the position is the one of the chosen title in the queue; a chosen
 * folder or series is not in the queue, and its requested position stays.
 * @param queueIds The ids of the queue sent to the server.
 * @param chosenId The id of the title the user chose, if any.
 * @param requestedIndex The position the caller asked for.
 */
export function findStartIndex(queueIds: string[], chosenId: string | null | undefined, requestedIndex = 0): number {
    const safeIndex = requestedIndex >= 0 && requestedIndex < queueIds.length ? requestedIndex : 0;
    if (!chosenId || queueIds[safeIndex] === chosenId) return safeIndex;
    const index = queueIds.indexOf(chosenId);
    return index === -1 ? safeIndex : index;
}
