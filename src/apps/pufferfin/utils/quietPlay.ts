/**
 * Html class that hides the large loader of the player while a play started
 * from Pufferfin gets going: playback just starts, with no loader over the
 * page behind it.
 */
export const QUIET_LOADING_CLASS = 'pf-quiet-loading';

/** Past this, the loader of the player may show again even if it never said playback started. */
const MAX_QUIET_MS = 20_000;

let running = 0;

/** Runs a play with the large loader of the player hidden until it settles. */
export async function quietPlay(play: () => Promise<unknown>): Promise<void> {
    running++;
    document.documentElement.classList.add(QUIET_LOADING_CLASS);
    const timeout = new Promise<void>(resolve => setTimeout(resolve, MAX_QUIET_MS));
    try {
        await Promise.race([ play(), timeout ]);
    } finally {
        running--;
        if (!running) document.documentElement.classList.remove(QUIET_LOADING_CLASS);
    }
}
