import { matchRoutes, type RouteObject } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { getCatalogTitlePath, getItemPath, getLibraryPath, isPufferfinPath, parseSheetTarget } from './paths';
import { CatalogItemKind } from '../features/catalog/api/types';
import { PUFFERFIN_APP_ROUTES } from './routes';

// The route guard and error page pull the whole legacy app; only the route table is under test
vi.mock('components/ConnectionRequired', () => ({ default: () => null }));
vi.mock('components/router/ErrorBoundary', () => ({ default: () => null }));

// Same shape as the upstream app routes: an index redirect and `home` nested under the `/*` app route
const UPSTREAM_HOME_ID = 'upstream-home';
const UPSTREAM_INDEX_ID = 'upstream-index';
const UPSTREAM_ROUTES: RouteObject[] = [
    {
        path: '/*',
        children: [
            { index: true, id: UPSTREAM_INDEX_ID },
            { children: [ { path: 'home', id: UPSTREAM_HOME_ID }, { path: 'movies', id: 'upstream-movies' } ] }
        ]
    }
];

const matchLeaf = (routes: RouteObject[], pathname: string) => {
    const matches = matchRoutes(routes, pathname);
    return matches?.[matches.length - 1]?.route;
};

describe('Pufferfin: routes', () => {
    it.each([
        [ 'upstream routes first', [ ...UPSTREAM_ROUTES, ...PUFFERFIN_APP_ROUTES ] ],
        [ 'Pufferfin routes first', [ ...PUFFERFIN_APP_ROUTES, ...UPSTREAM_ROUTES ] ]
    ])('serves the Pufferfin home on /home, %s', (_, routes) => {
        const leaf = matchLeaf(routes, '/home');
        expect(leaf?.id).not.toBe(UPSTREAM_HOME_ID);
        expect(leaf?.lazy).toBeDefined();
    });

    it.each([
        [ 'upstream routes first', [ ...UPSTREAM_ROUTES, ...PUFFERFIN_APP_ROUTES ] ],
        [ 'Pufferfin routes first', [ ...PUFFERFIN_APP_ROUTES, ...UPSTREAM_ROUTES ] ]
    ])('sends the bare address of the site to the library, %s', (_, routes) => {
        const leaf = matchLeaf(routes, '/');
        expect(leaf?.id).not.toBe(UPSTREAM_INDEX_ID);
        expect(leaf?.index).toBe(true);
        expect((leaf?.element as { props?: { to?: string } } | undefined)?.props?.to).toBe(getLibraryPath());
    });

    it('leaves the other upstream pages alone', () => {
        expect(matchLeaf([ ...UPSTREAM_ROUTES, ...PUFFERFIN_APP_ROUTES ], '/movies')?.id).toBe('upstream-movies');
    });

    it('sends the former home address to /home', () => {
        const leaf = matchLeaf(PUFFERFIN_APP_ROUTES, '/pufferfin');
        expect(leaf?.index).toBe(true);
        expect(leaf?.element).toBeDefined();
    });

    it('sends the former menu and search addresses to the home, the menu and the search being in the bar now', () => {
        expect(matchLeaf(PUFFERFIN_APP_ROUTES, '/pufferfin/menu')?.element).toBeDefined();
        expect(matchLeaf(PUFFERFIN_APP_ROUTES, '/pufferfin/search')?.element).toBeDefined();
    });

    it('hides the upstream header on the home and the Pufferfin screens only', () => {
        expect(isPufferfinPath('/home')).toBe(true);
        expect(isPufferfinPath('/pufferfin')).toBe(true);
        expect(isPufferfinPath('/pufferfin/library')).toBe(true);
        expect(isPufferfinPath('/homevideos')).toBe(false);
        expect(isPufferfinPath('/movies')).toBe(false);
    });

    it('serves one title sheet route for library ids and TMDB ids alike', () => {
        const byLibraryId = matchLeaf(PUFFERFIN_APP_ROUTES, getItemPath('abc'));
        const byTmdbId = matchLeaf(PUFFERFIN_APP_ROUTES, getCatalogTitlePath(CatalogItemKind.Movie, 603));
        expect(byLibraryId).toBeDefined();
        expect(byLibraryId).toBe(byTmdbId);
    });

    it('keeps the former sheet address, which only redirects', () => {
        const legacy = matchLeaf(PUFFERFIN_APP_ROUTES, '/pufferfin/item/abc');
        expect(legacy?.lazy).toBeDefined();
        expect(legacy).not.toBe(matchLeaf(PUFFERFIN_APP_ROUTES, getItemPath('abc')));
    });

    it('reads what a title sheet address points to', () => {
        const isAsin = (value: string) => /^[A-Z0-9]{10}$/.test(value);
        expect(parseSheetTarget('item', 'abc', isAsin)).toEqual({ kind: 'item', itemId: 'abc' });
        expect(parseSheetTarget('movie', '603', isAsin)).toEqual({ kind: 'catalog', titleKind: CatalogItemKind.Movie, tmdbId: 603 });
        expect(parseSheetTarget('series', '1399', isAsin)).toEqual({ kind: 'catalog', titleKind: CatalogItemKind.Series, tmdbId: 1399 });
        expect(parseSheetTarget('audiobook', 'B0036NAKL0', isAsin)).toEqual({ kind: 'audiobook', asin: 'B0036NAKL0' });
        expect(parseSheetTarget('movie', 'abc', isAsin)).toBeUndefined();
        expect(parseSheetTarget('unknown', '1', isAsin)).toBeUndefined();
        expect(parseSheetTarget('audiobook', 'nope', isAsin)).toBeUndefined();
    });
});
