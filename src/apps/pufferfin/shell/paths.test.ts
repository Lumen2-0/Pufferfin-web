import { describe, expect, it } from 'vitest';

import {
    ASYNC_PUBLIC_ROUTES as LEGACY_ASYNC_PUBLIC_ROUTES,
    ASYNC_USER_ROUTES as LEGACY_ASYNC_USER_ROUTES
} from 'apps/legacy/routes/asyncRoutes';
import {
    LEGACY_PUBLIC_ROUTES as LEGACY_VIEW_PUBLIC_ROUTES,
    LEGACY_USER_ROUTES as LEGACY_VIEW_USER_ROUTES
} from 'apps/legacy/routes/legacyRoutes';
import { ASYNC_PUBLIC_ROUTES, ASYNC_USER_ROUTES } from 'apps/modern/routes/asyncRoutes';
import { LEGACY_PUBLIC_ROUTES, LEGACY_USER_ROUTES } from 'apps/modern/routes/legacyRoutes';

import { isShellPath } from './paths';

const toPathname = ({ path }: { path: string }) => `/${path}`;

// Every user page of both upstream layouts, as their route tables declare them
const USER_PATHNAMES = [
    ...ASYNC_USER_ROUTES,
    ...LEGACY_USER_ROUTES,
    ...LEGACY_ASYNC_USER_ROUTES,
    ...LEGACY_VIEW_USER_ROUTES
].map(toPathname)
    // The Pufferfin home outranks the upstream one and draws its own bar; the video screen has none
    .filter(pathname => pathname !== '/home' && pathname !== '/video');

const PUBLIC_PATHNAMES = [
    ...ASYNC_PUBLIC_ROUTES,
    ...LEGACY_PUBLIC_ROUTES,
    ...LEGACY_ASYNC_PUBLIC_ROUTES,
    ...LEGACY_VIEW_PUBLIC_ROUTES
].map(toPathname);

describe('Pufferfin: shell paths', () => {
    it('covers the upstream user pages', () => {
        expect(USER_PATHNAMES).toEqual(expect.arrayContaining([ '/movies', '/details', '/mypreferencesmenu', '/userprofile' ]));
    });

    it.each(USER_PATHNAMES)('puts the Pufferfin bar on the upstream user page %s', pathname => {
        expect(isShellPath(pathname)).toBe(true);
    });

    it.each(PUBLIC_PATHNAMES)('leaves the public page %s without a navigation bar', pathname => {
        expect(isShellPath(pathname)).toBe(false);
    });

    it('leaves the video screen to its own controls', () => {
        expect(isShellPath('/video')).toBe(false);
    });

    it.each([ '/home', '/pufferfin', '/pufferfin/search' ])('leaves %s to the Pufferfin layout, which has the bar already', pathname => {
        expect(isShellPath(pathname)).toBe(false);
    });
});
