import { beforeEach, describe, expect, it, vi } from 'vitest';

import { disablePlayerSkin, enablePlayerSkin, isEndOfSession, PLAYER_SKIN_CLASS } from './playerSkin';

// Hoisted above the import: the upstream playback manager pulls the whole legacy app; only the skin switch is under test
vi.mock('components/playback/playbackmanager', () => ({ playbackManager: {} }));
vi.mock('./player.scss', () => ({}));

describe('Pufferfin: player skin', () => {
    beforeEach(() => disablePlayerSkin());

    it('ends the session only when no item follows', () => {
        expect(isEndOfSession()).toBe(true);
        expect(isEndOfSession({ nextItem: null })).toBe(true);
        expect(isEndOfSession({ nextItem: { Id: 'next-episode' } })).toBe(false);
    });

    it('toggles the class on the document element', () => {
        enablePlayerSkin();
        expect(document.documentElement.classList.contains(PLAYER_SKIN_CLASS)).toBe(true);
        disablePlayerSkin();
        expect(document.documentElement.classList.contains(PLAYER_SKIN_CLASS)).toBe(false);
    });
});
