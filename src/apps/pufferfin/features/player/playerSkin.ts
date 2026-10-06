import { playbackManager } from 'components/playback/playbackmanager';
import Events from 'utils/events';

import './player.scss';

/**
 * The player keeps the upstream video screen and its logic (tracks, subtitles,
 * skip intro, chapters, SyncPlay) and gets the Pufferfin look through a class
 * on the document element, only for playback started from a Pufferfin screen.
 * A playback started from the upstream interface keeps the upstream look.
 */
export const PLAYER_SKIN_CLASS = 'pf-player-skin';

/**
 * How long a Pufferfin play request waits for its playback to start. Past it,
 * the request is considered lost (a start that failed without an error), and
 * the next playback to start, which may come from the upstream interface, does
 * not get the skin.
 */
export const PENDING_TIMEOUT_MS = 60_000;

export type SkinSession =
    | { phase: 'idle' }
    | { phase: 'pending', since: number }
    | { phase: 'active' };

export type SkinEvent =
    /** Pufferfin asked the playback manager to play. */
    | { type: 'request', now: number }
    /** Some playback started, from Pufferfin or not. */
    | { type: 'start', now: number }
    /** A playback stopped; `endOfSession` is false when a next item follows. */
    | { type: 'stop', endOfSession: boolean }
    /** The Pufferfin play request failed with an error. */
    | { type: 'fail' };

const IDLE: SkinSession = { phase: 'idle' };

export function nextSession(session: SkinSession, event: SkinEvent): SkinSession {
    switch (event.type) {
        case 'request':
            return { phase: 'pending', since: event.now };
        case 'start':
            if (session.phase === 'active') return session;
            if (session.phase === 'pending' && event.now - session.since <= PENDING_TIMEOUT_MS) {
                return { phase: 'active' };
            }
            return IDLE;
        case 'stop':
            // While pending, a stop belongs to the playback being replaced, not to ours
            return session.phase === 'active' && event.endOfSession ? IDLE : session;
        case 'fail':
            return IDLE;
    }
}

interface PlaybackStopInfo {
    nextItem?: unknown
}

/** A stop that hands over to a next item (next episode, playlist) keeps the session going. */
export function isEndOfSession(info?: PlaybackStopInfo | null) {
    return !info?.nextItem;
}

let session: SkinSession = IDLE;
let isSubscribed = false;

function dispatch(event: SkinEvent) {
    session = nextSession(session, event);
    document.documentElement.classList.toggle(PLAYER_SKIN_CLASS, session.phase !== 'idle');
}

function subscribe() {
    if (isSubscribed) return;
    isSubscribed = true;
    Events.on(playbackManager, 'playbackstart', () => dispatch({ type: 'start', now: Date.now() }));
    Events.on(playbackManager, 'playbackstop', (_e: unknown, info?: PlaybackStopInfo) => {
        dispatch({ type: 'stop', endOfSession: isEndOfSession(info) });
    });
}

/** Called right before a Pufferfin screen starts playback. */
export function enablePlayerSkin() {
    subscribe();
    dispatch({ type: 'request', now: Date.now() });
}

/** Called when a Pufferfin play request fails. */
export function disablePlayerSkin() {
    dispatch({ type: 'fail' });
}
