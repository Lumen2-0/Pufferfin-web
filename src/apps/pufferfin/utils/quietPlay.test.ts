import { describe, expect, it, vi } from 'vitest';

import { QUIET_LOADING_CLASS, quietPlay } from './quietPlay';

describe('quietPlay', () => {
    it('starts one play at a time: a second click on the same title while it gets going is the same play', async () => {
        let finish!: () => void;
        const first = vi.fn(() => new Promise<void>(resolve => {
            finish = resolve;
        }));
        const second = vi.fn(() => Promise.resolve());

        const started = quietPlay(first, 'item:a');
        const again = quietPlay(second, 'item:a');

        expect(again).toBe(started);
        expect(second).not.toHaveBeenCalled();
        expect(document.documentElement.classList.contains(QUIET_LOADING_CLASS)).toBe(true);

        finish();
        await started;

        expect(document.documentElement.classList.contains(QUIET_LOADING_CLASS)).toBe(false);
    });

    it('plays the last title chosen: a click on another title while one gets going starts it', async () => {
        let finishFirst!: () => void;
        const first = vi.fn(() => new Promise<void>(resolve => {
            finishFirst = resolve;
        }));
        let finishSecond!: () => void;
        const second = vi.fn(() => new Promise<void>(resolve => {
            finishSecond = resolve;
        }));

        const started = quietPlay(first, 'item:a');
        const other = quietPlay(second, 'item:b');

        expect(other).not.toBe(started);
        expect(second).toHaveBeenCalledOnce();

        // The first one settling does not end the loader of the second
        finishFirst();
        await started;
        expect(document.documentElement.classList.contains(QUIET_LOADING_CLASS)).toBe(true);

        // A click on the second title again is still the second play
        expect(quietPlay(vi.fn(() => Promise.resolve()), 'item:b')).toBe(other);

        finishSecond();
        await other;
        expect(document.documentElement.classList.contains(QUIET_LOADING_CLASS)).toBe(false);
    });

    it('lets a new play start once the last one settled, even when it failed', async () => {
        await expect(quietPlay(() => Promise.reject(new Error('no stream')), 'item:a')).rejects.toThrow('no stream');

        const next = vi.fn(() => Promise.resolve());
        await quietPlay(next, 'item:a');

        expect(next).toHaveBeenCalledOnce();
        expect(document.documentElement.classList.contains(QUIET_LOADING_CLASS)).toBe(false);
    });
});
