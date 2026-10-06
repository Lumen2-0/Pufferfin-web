import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    disablePlayerSkin,
    enablePlayerSkin,
    isEndOfSession,
    nextSession,
    PENDING_TIMEOUT_MS,
    PLAYER_SKIN_CLASS,
    type SkinSession
} from './playerSkin';

// Hoisted above the import: the upstream playback manager pulls the whole legacy app; only the skin switch is under test
vi.mock('components/playback/playbackmanager', () => ({ playbackManager: {} }));
vi.mock('./player.scss', () => ({}));

const idle: SkinSession = { phase: 'idle' };
const pending: SkinSession = { phase: 'pending', since: 1000 };
const active: SkinSession = { phase: 'active' };

describe('Pufferfin: player skin session', () => {
    it('ends the session only when no item follows', () => {
        expect(isEndOfSession()).toBe(true);
        expect(isEndOfSession({ nextItem: null })).toBe(true);
        expect(isEndOfSession({ nextItem: { Id: 'next-episode' } })).toBe(false);
    });

    it('activates when the requested playback starts in time', () => {
        expect(nextSession(idle, { type: 'request', now: 1000 })).toEqual(pending);
        expect(nextSession(pending, { type: 'start', now: 2000 })).toEqual(active);
    });

    it('drops a request that never started, so an upstream playback is not skinned', () => {
        expect(nextSession(pending, { type: 'start', now: 1000 + PENDING_TIMEOUT_MS + 1 })).toEqual(idle);
    });

    it('leaves a playback started from the upstream interface alone', () => {
        expect(nextSession(idle, { type: 'start', now: 5000 })).toEqual(idle);
    });

    it('keeps the skin from one episode to the next', () => {
        expect(nextSession(active, { type: 'stop', endOfSession: false })).toEqual(active);
        expect(nextSession(active, { type: 'start', now: 9000 })).toEqual(active);
        expect(nextSession(active, { type: 'stop', endOfSession: true })).toEqual(idle);
    });

    it('ignores the stop of the playback being replaced while a request is pending', () => {
        expect(nextSession(pending, { type: 'stop', endOfSession: true })).toEqual(pending);
    });

    it('drops the session when the request fails', () => {
        expect(nextSession(pending, { type: 'fail' })).toEqual(idle);
    });
});

describe('Pufferfin: player skin class', () => {
    beforeEach(() => disablePlayerSkin());

    it('is set on request and removed on failure', () => {
        enablePlayerSkin();
        expect(document.documentElement.classList.contains(PLAYER_SKIN_CLASS)).toBe(true);
        disablePlayerSkin();
        expect(document.documentElement.classList.contains(PLAYER_SKIN_CLASS)).toBe(false);
    });
});
