import type { Query } from '@tanstack/react-query';

/** Pufferfin lists that show watch progress: cards, rows, the episodes of a season. */
const PROGRESS_LISTS = new Set([ 'Home', 'Library', 'Details', 'Discover' ]);

/** Whether a query holds the watch progress of library items of a user. */
export function holdsUserData(queryKey: Query['queryKey'], userId: string) {
    if (queryKey[0] === 'User') return queryKey[1] === userId && queryKey[2] === 'Items';
    return queryKey[0] === 'Pufferfin' && PROGRESS_LISTS.has(String(queryKey[1]));
}
