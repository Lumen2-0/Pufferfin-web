import { describe, expect, it, vi } from 'vitest';

import { ItemKind } from 'types/base/models/item-kind';

import { getDetailItemId } from './navigation';

// The upstream router pulls the whole legacy app; only the pure helper is under test
vi.mock('components/router/appRouter', () => ({ appRouter: {} }));

describe('Pufferfin: detail navigation', () => {
    it('opens movies and series on their own page', () => {
        expect(getDetailItemId({ Type: ItemKind.Movie, Id: 'movie' })).toBe('movie');
        expect(getDetailItemId({ Type: ItemKind.Series, Id: 'series' })).toBe('series');
    });

    it('opens seasons and episodes on their series page', () => {
        expect(getDetailItemId({ Type: ItemKind.Season, Id: 'season', SeriesId: 'series' })).toBe('series');
        expect(getDetailItemId({ Type: ItemKind.Episode, Id: 'episode', SeriesId: 'series' })).toBe('series');
    });

    it('has no Pufferfin page for other types or orphan episodes', () => {
        expect(getDetailItemId({ Type: ItemKind.MusicAlbum, Id: 'album' })).toBeUndefined();
        expect(getDetailItemId({ Type: ItemKind.Episode, Id: 'episode' })).toBeUndefined();
    });
});
