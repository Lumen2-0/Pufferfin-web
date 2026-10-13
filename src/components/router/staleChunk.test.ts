import { describe, expect, it } from 'vitest';

import { isStaleChunkError, shouldReload } from './staleChunk';

describe('staleChunk', () => {
    it('knows a chunk that failed to load', () => {
        const error = new Error('Loading chunk 26765 failed. (error: https://example.com/web/26765.chunk.js)');
        expect(isStaleChunkError(error)).toBe(true);
        const named = new Error('x');
        named.name = 'ChunkLoadError';
        expect(isStaleChunkError(named)).toBe(true);
        expect(isStaleChunkError(new Error('Loading CSS chunk 12 failed.'))).toBe(true);
    });

    it('leaves other errors alone', () => {
        expect(isStaleChunkError(new Error('Network error'))).toBe(false);
        expect(isStaleChunkError('Loading chunk 1 failed')).toBe(false);
    });

    it('reloads once in a short while', () => {
        expect(shouldReload(null, 1000)).toBe(true);
        expect(shouldReload(1000, 5000)).toBe(false);
        expect(shouldReload(1000, 40_000)).toBe(true);
    });
});
