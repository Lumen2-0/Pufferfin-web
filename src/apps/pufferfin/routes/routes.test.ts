import { matchRoutes, type RouteObject } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { isPufferfinPath } from './paths';
import { PUFFERFIN_APP_ROUTES } from './routes';

// The route guard and error page pull the whole legacy app; only the route table is under test
vi.mock('components/ConnectionRequired', () => ({ default: () => null }));
vi.mock('components/router/ErrorBoundary', () => ({ default: () => null }));

// Same shape as the upstream app routes: `home` nested under the `/*` app route
const UPSTREAM_HOME_ID = 'upstream-home';
const UPSTREAM_ROUTES: RouteObject[] = [
    {
        path: '/*',
        children: [
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

    it('leaves the other upstream pages alone', () => {
        expect(matchLeaf([ ...UPSTREAM_ROUTES, ...PUFFERFIN_APP_ROUTES ], '/movies')?.id).toBe('upstream-movies');
    });

    it('sends the former home address to /home', () => {
        const leaf = matchLeaf(PUFFERFIN_APP_ROUTES, '/pufferfin');
        expect(leaf?.index).toBe(true);
        expect(leaf?.element).toBeDefined();
    });

    it('serves the menu that replaces the upstream header', () => {
        expect(matchLeaf(PUFFERFIN_APP_ROUTES, '/pufferfin/menu')?.lazy).toBeDefined();
    });

    it('hides the upstream header on the home and the Pufferfin screens only', () => {
        expect(isPufferfinPath('/home')).toBe(true);
        expect(isPufferfinPath('/pufferfin')).toBe(true);
        expect(isPufferfinPath('/pufferfin/library')).toBe(true);
        expect(isPufferfinPath('/homevideos')).toBe(false);
        expect(isPufferfinPath('/movies')).toBe(false);
    });
});
