import { describe, expect, it } from 'vitest';

import { getCardShape } from './images';

describe('getCardShape', () => {
    it('makes an audiobook square, from the library or from the catalog', () => {
        expect(getCardShape('portrait', { Type: 'AudioBook' })).toBe('square');
        expect(getCardShape('landscape', { Type: 'Folder' })).toBe('square');
        expect(getCardShape('portrait', { Kind: 'Audiobook' })).toBe('square');
    });

    it('keeps the shape asked for anything else', () => {
        expect(getCardShape('portrait', { Type: 'Movie' })).toBe('portrait');
        expect(getCardShape('landscape', { Type: 'Episode' })).toBe('landscape');
        expect(getCardShape('portrait', '/pufferfin/title/movie/1')).toBe('portrait');
        expect(getCardShape('portrait', undefined)).toBe('portrait');
    });
});
