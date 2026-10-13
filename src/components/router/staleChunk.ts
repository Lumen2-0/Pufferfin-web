// PUFFERFIN: a tab opened before an update asks for code files the server no longer has.
// The page then reloads itself, once, onto the new version instead of showing the error.

const RELOAD_KEY = 'pufferfin-stale-chunk-reload';
/** A second failure this soon after a reload is a real one: it is shown, never reloaded in a loop. */
const RELOAD_GUARD_MS = 30_000;

/** Whether an error is a code file that could not be loaded. */
export function isStaleChunkError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return error.name === 'ChunkLoadError' || /Loading (CSS )?chunk [\w-]+ failed/i.test(error.message);
}

/** Whether the page may reload for it now, given the time of the last such reload. */
export function shouldReload(lastReloadAt: number | null, now: number): boolean {
    return lastReloadAt === null || now - lastReloadAt > RELOAD_GUARD_MS;
}

/** Reloads the page for a stale code file, at most once in a short while. Tells whether it did. */
export function reloadForStaleChunk(error: unknown): boolean {
    if (!isStaleChunkError(error)) return false;
    let last: number | null = null;
    try {
        const stored = sessionStorage.getItem(RELOAD_KEY);
        last = stored ? Number(stored) : null;
    } catch {
        // Without storage, one reload is still safe: the guard just cannot be read
    }
    const now = Date.now();
    if (!shouldReload(last, now)) return false;
    try {
        sessionStorage.setItem(RELOAD_KEY, String(now));
    } catch {
        // Ignored, see above
    }
    window.location.reload();
    return true;
}
