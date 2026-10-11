import { describe, expect, it, vi } from 'vitest';

import { QUIET_LOADING_CLASS, quietPlay } from './quietPlay';

describe('quietPlay', () => {
    it('starts one play at a time: a second click while it gets going is the same play', async () => {
        let finish!: () => void;
        const first = vi.fn(() => new Promise<void>(resolve => {
            finish = resolve;
        }));
        const second = vi.fn(() => Promise.resolve());

        const started = quietPlay(first);
        const again = quietPlay(second);

        expect(again).toBe(started);
        expect(second).not.toHaveBeenCalled();
        expect(document.documentElement.classList.contains(QUIET_LOADING_CLASS)).toBe(true);

        finish();
        await started;

        expect(document.documentElement.classList.contains(QUIET_LOADING_CLASS)).toBe(false);
    });

    it('lets a new play start once the last one settled, even when it failed', async () => {
        await expect(quietPlay(() => Promise.reject(new Error('no stream')))).rejects.toThrow('no stream');

        const next = vi.fn(() => Promise.resolve());
        await quietPlay(next);

        expect(next).toHaveBeenCalledOnce();
        expect(document.documentElement.classList.contains(QUIET_LOADING_CLASS)).toBe(false);
    });
});
