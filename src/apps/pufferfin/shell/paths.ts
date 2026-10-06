import { ASYNC_PUBLIC_ROUTES as LEGACY_ASYNC_PUBLIC_ROUTES } from 'apps/legacy/routes/asyncRoutes';
import { LEGACY_PUBLIC_ROUTES as LEGACY_VIEW_PUBLIC_ROUTES } from 'apps/legacy/routes/legacyRoutes';
import { ASYNC_PUBLIC_ROUTES } from 'apps/modern/routes/asyncRoutes';
import { LEGACY_PUBLIC_ROUTES } from 'apps/modern/routes/legacyRoutes';

import { isPufferfinPath } from '../routes/paths';

/** The video screen has its own on screen controls and no top bar, upstream as here. */
const VIDEO_PATH = '/video';

/** Pages reachable without a user, as the upstream route tables declare them. */
const PUBLIC_PATHNAMES = new Set([
    ...ASYNC_PUBLIC_ROUTES,
    ...LEGACY_PUBLIC_ROUTES,
    ...LEGACY_ASYNC_PUBLIC_ROUTES,
    ...LEGACY_VIEW_PUBLIC_ROUTES
].map(({ path }) => `/${path}`));

/**
 * Whether an upstream page gets the Pufferfin bar in place of the upstream
 * header. Public pages (sign in, server selection) have no user yet, so no
 * navigation to offer; the Pufferfin screens render the bar themselves.
 */
export const isShellPath = (pathname: string) =>
    pathname !== VIDEO_PATH
    && !PUBLIC_PATHNAMES.has(pathname)
    && !isPufferfinPath(pathname);
