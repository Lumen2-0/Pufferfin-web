import type { RouteObject } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

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
import { WIZARD_APP_ROUTES } from 'apps/wizard/routes/routes';

import { FormSkinKind, getFormSkinKind, PUBLIC_PATHS, SETTINGS_PATHS, WIZARD_PATH, WIZARD_STEPS } from './paths';

// The wizard layout and its route guard pull the whole legacy app; only the route table is under test
vi.mock('apps/legacy/AppLayout', () => ({ default: () => null }));
vi.mock('components/ConnectionRequired', () => ({ default: () => null }));
vi.mock('components/router/ErrorBoundary', () => ({ default: () => null }));
vi.mock('components/router/LegacyRoute', () => ({ toViewManagerPageRoute: ({ path }: { path: string }) => ({ path }) }));

const toPathname = ({ path }: { path: string }) => `/${path}`;

// Every user and public page of both upstream layouts, as their route tables declare them
const USER_PATHNAMES = [
    ...ASYNC_USER_ROUTES,
    ...LEGACY_USER_ROUTES,
    ...LEGACY_ASYNC_USER_ROUTES,
    ...LEGACY_VIEW_USER_ROUTES
].map(toPathname);

const PUBLIC_PATHNAMES = [
    ...ASYNC_PUBLIC_ROUTES,
    ...LEGACY_PUBLIC_ROUTES,
    ...LEGACY_ASYNC_PUBLIC_ROUTES,
    ...LEGACY_VIEW_PUBLIC_ROUTES
].map(toPathname);

/** Walks a route table and lists the full path of every route that declares one. */
const walk = (routes: RouteObject[], parent = ''): string[] => routes.flatMap(route => {
    const pathname = route.path ? `${parent}/${route.path}` : parent;
    return [
        ...(route.path ? [ pathname ] : []),
        ...walk(route.children ?? [], pathname)
    ];
});

const WIZARD_PATHNAMES = walk(WIZARD_APP_ROUTES);

const SETTINGS_PATHNAMES = SETTINGS_PATHS.map(path => `/${path}`);

describe('Pufferfin: form skin paths', () => {
    // A page renamed or dropped upstream must not silently fall back to its original style
    it.each(SETTINGS_PATHNAMES)('finds the settings page %s in the upstream user routes', pathname => {
        expect(USER_PATHNAMES).toContain(pathname);
    });

    it.each(SETTINGS_PATHNAMES)('serves the settings page %s in the Pufferfin style', pathname => {
        expect(getFormSkinKind(pathname)).toBe(FormSkinKind.Settings);
    });

    it('covers every public page of the upstream route tables', () => {
        expect(PUBLIC_PATHNAMES.length).toBeGreaterThan(0);
        expect(new Set(PUBLIC_PATHNAMES)).toEqual(new Set(PUBLIC_PATHS.map(path => `/${path}`)));
    });

    it.each(PUBLIC_PATHNAMES)('serves the public page %s in the Pufferfin style', pathname => {
        expect(getFormSkinKind(pathname)).toBe(FormSkinKind.Public);
    });

    it('covers every step of the upstream wizard route table', () => {
        expect(new Set(WIZARD_PATHNAMES)).toEqual(new Set([
            `/${WIZARD_PATH}`,
            ...WIZARD_STEPS.map(step => `/${WIZARD_PATH}/${step}`)
        ]));
    });

    it.each(WIZARD_PATHNAMES)('serves the wizard page %s in the Pufferfin style', pathname => {
        expect(getFormSkinKind(pathname)).toBe(FormSkinKind.Wizard);
    });

    it('ignores a trailing slash', () => {
        expect(getFormSkinKind('/login/')).toBe(FormSkinKind.Public);
        expect(getFormSkinKind('/wizard/start/')).toBe(FormSkinKind.Wizard);
    });

    it.each([ '/', '/home', '/movies', '/details', '/video', '/queue', '/dashboard', '/pufferfin/menu', '/mypreferences' ])(
        'leaves %s to its own style',
        pathname => {
            expect(getFormSkinKind(pathname)).toBeUndefined();
        }
    );
});
