import { describe, expect, it } from 'vitest';

import { CatalogItemKind } from '../../catalog/api/types';

import { DiscoverType } from './discover';
import { familyOf, getThemePool, pickThemeRows, THEME_SLOT_MS } from './themes';

const NOW = Date.UTC(2026, 9, 8, 12);
const echo = (key: string, ...args: Array<string | number>) => [ key, ...args ].join(' ');

describe('pickThemeRows', () => {
    it('gives the same rows within a slot and other ones in the next', () => {
        const first = pickThemeRows(DiscoverType.All, NOW).map(row => row.id);
        expect(pickThemeRows(DiscoverType.All, NOW + 1000).map(row => row.id)).toEqual(first);
        expect(pickThemeRows(DiscoverType.All, NOW + THEME_SLOT_MS).map(row => row.id)).not.toEqual(first);
    });

    it('mixes films, series and audiobooks on All, never twice the same kind in a row when another is left', () => {
        const rows = pickThemeRows(DiscoverType.All, NOW);
        const families = rows.map(familyOf);
        expect(new Set(families)).toEqual(new Set([ CatalogItemKind.Movie, CatalogItemKind.Series, 'audiobook' ]));
        expect(families.some((family, index) => index > 0 && family === families[index - 1])).toBe(false);
    });

    it('shows one genre once per screen', () => {
        const rows = pickThemeRows(DiscoverType.Movies, NOW);
        const genres = rows.flatMap(row => (row.source === 'tmdb' && row.genreId ? [ row.genreId ] : []));
        expect(new Set(genres).size).toBe(genres.length);
        expect(rows.length).toBeGreaterThan(10);
    });

    it('keeps to the type: audiobooks only on Audiobooks', () => {
        const audiobooks = pickThemeRows(DiscoverType.Audiobooks, NOW);
        expect(audiobooks.length).toBe(12);
        expect(audiobooks.every(row => row.source === 'audible')).toBe(true);
    });

    it('shows genres and their variants only: every row names a genre', () => {
        const pool = getThemePool(DiscoverType.All, 2026);
        expect(pool.every(row => (row.source === 'tmdb' ? !!row.genreId || !!row.tvTypes : true))).toBe(true);
        expect(pool.some(row => row.source === 'tmdb' && 'originalLanguage' in row)).toBe(false);
        const titles = pool.map(row => row.title(echo));
        expect(titles).toContain('ThemeMoviesBest GenreAction');
        expect(titles).toContain('ThemeSeriesBestOfYear GenreDrama 2026');
        expect(titles).toContain('ThemeAudiobooksBest GenreCrime');
    });

    it('fills a screen with more variants of a genre when genres run out', () => {
        const rows = pickThemeRows(DiscoverType.TvShows, NOW);
        expect(rows.length).toBe(6);
        expect(new Set(rows.map(row => row.id)).size).toBe(6);
    });

    it('names the year of a yearly row', () => {
        const row = getThemePool(DiscoverType.Movies, 2026).find(entry => entry.id === 'Movie-horror-best-2026');
        expect(row?.title(echo)).toBe('ThemeMoviesBestOfYear GenreHorror 2026');
    });

    it('keeps to series under a network, and to films and series under any brand', () => {
        expect(pickThemeRows(DiscoverType.All, NOW, { seriesOnly: true }).every(row => row.source === 'tmdb' && row.kind === CatalogItemKind.Series)).toBe(true);
        expect(pickThemeRows(DiscoverType.All, NOW, { titlesOnly: true }).every(row => row.source === 'tmdb')).toBe(true);
    });
});
