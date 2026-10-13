/**
 * Html class that hides the large loader of the player while a play started
 * from Pufferfin gets going: playback just starts, with no loader over the
 * page behind it, only a thin bar at the top of the page.
 */
export const QUIET_LOADING_CLASS = 'pf-quiet-loading';

/** Past this, the loader of the player may show again even if it never said playback started. */
const MAX_QUIET_MS = 20_000;

interface Start {
    key: string | undefined
    promise: Promise<void>
}

let starting: Start | null = null;

/**
 * Runs a play with the large loader of the player hidden until it settles.
 * A second click on the same thing while it is getting going is the same
 * play, not a new one that would close the player just opened and open it
 * again. A click on something else is a new choice: it starts at once, and
 * the play it replaces no longer counts, so the last title chosen is the one
 * that plays.
 * @param play Starts the playback.
 * @param key What is played, such as the item id: plays with the same key are one play.
 */
export function quietPlay(play: () => Promise<unknown>, key?: string): Promise<void> {
    if (starting && starting.key === key) return starting.promise;

    document.documentElement.classList.add(QUIET_LOADING_CLASS);
    const timeout = new Promise<void>(resolve => setTimeout(resolve, MAX_QUIET_MS));
    const start: Start = { key, promise: Promise.resolve() };
    start.promise = (async () => {
        try {
            await Promise.race([ play(), timeout ]);
        } finally {
            // A later choice owns the loader now: only the last play clears it
            if (starting === start) {
                starting = null;
                document.documentElement.classList.remove(QUIET_LOADING_CLASS);
            }
        }
    })();
    starting = start;
    return start.promise;
}
