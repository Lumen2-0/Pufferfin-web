import type { RouteObject } from 'react-router-dom';

import { AdminPageId } from './constants/pages';

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
        path: `pufferfin/${AdminPageId.Requests}`,
        lazy: () => import(/* webpackChunkName: "pufferfin-admin" */ './routes/requests')
    },
    {
        path: `pufferfin/${AdminPageId.Users}`,
        lazy: () => import(/* webpackChunkName: "pufferfin-admin" */ './routes/users')
    },
    {
        path: `pufferfin/${AdminPageId.Storage}`,
        lazy: () => import(/* webpackChunkName: "pufferfin-admin" */ './routes/storage')
    },
    {
        path: 'pufferfin/:groupId',
        lazy: () => import(/* webpackChunkName: "pufferfin-admin" */ './routes/group')
    }
];
