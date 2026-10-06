import { playbackManager } from 'components/playback/playbackmanager';
import Events from 'utils/events';

import './player.scss';

/**
 * The player keeps the upstream video screen and its logic (tracks, subtitles,
 * skip intro, chapters, SyncPlay) and gets the Pufferfin look through a class
 * on the document element. The class is set when playback starts from a
 * Pufferfin screen and removed when that playback session ends, so a playback
 * started from the upstream interface keeps the upstream look.
 */
export const PLAYER_SKIN_CLASS = 'pf-player-skin';

interface PlaybackStopInfo {
    nextItem?: unknown
}

/** A stop that hands over to a next item (next episode, playlist) keeps the session going. */
export function isEndOfSession(info?: PlaybackStopInfo | null) {
    return !info?.nextItem;
}

let isSubscribed = false;

const onPlaybackStop = (_e: unknown, info?: PlaybackStopInfo) => {
    if (isEndOfSession(info)) disablePlayerSkin();
};

export function enablePlayerSkin() {
    document.documentElement.classList.add(PLAYER_SKIN_CLASS);
    if (!isSubscribed) {
        Events.on(playbackManager, 'playbackstop', onPlaybackStop);
        isSubscribed = true;
    }
}

export function disablePlayerSkin() {
    document.documentElement.classList.remove(PLAYER_SKIN_CLASS);
}
