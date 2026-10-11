/**
 * Html class that hides the large loader of the player while a play started
 * from Pufferfin gets going: playback just starts, with no loader over the
 * page behind it, only a thin bar at the top of the page.
 */
export const QUIET_LOADING_CLASS = 'pf-quiet-loading';

/** Past this, the loader of the player may show again even if it never said playback started. */
const MAX_QUIET_MS = 20_000;

let starting: Promise<void> | null = null;

/**
 * Runs a play with the large loader of the player hidden until it settles.
 * One play starts at a time: a second click while the first is getting going
 * is the same play, not a new one that would close the player just opened
 * and open it again.
 */
export function quietPlay(play: () => Promise<unknown>): Promise<void> {
    if (starting) return starting;

    document.documentElement.classList.add(QUIET_LOADING_CLASS);
    const timeout = new Promise<void>(resolve => setTimeout(resolve, MAX_QUIET_MS));
    starting = (async () => {
        try {
            await Promise.race([ play(), timeout ]);
        } finally {
            starting = null;
            document.documentElement.classList.remove(QUIET_LOADING_CLASS);
        }
    })();
    return starting;
}
