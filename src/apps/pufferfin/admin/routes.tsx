import type { RouteObject } from 'react-router-dom';

/**
 * Routes of the Pufferfin section of the admin dashboard, relative to `/dashboard`.
 * The pages live here, outside the upstream dashboard app, so that an upstream merge never touches them.
 */
export const PUFFERFIN_ADMIN_ROUTES: RouteObject[] = [
    {
        path: 'pufferfin',
        lazy: () => import(/* webpackChunkName: "pufferfin-admin" */ './routes/overview')
    },
    {
        path: 'pufferfin/:groupId',
        lazy: () => import(/* webpackChunkName: "pufferfin-admin" */ './routes/group')
    }
];
