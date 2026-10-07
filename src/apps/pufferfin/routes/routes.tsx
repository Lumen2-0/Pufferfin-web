import React from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';

import ConnectionRequired from 'components/ConnectionRequired';
import ErrorBoundary from 'components/router/ErrorBoundary';

import { getHomePath, HOME_APP_PATH, LEGACY_ITEM_ROUTE, PUFFERFIN_APP_PATH } from './paths';

/**
 * The Pufferfin home is mounted on `home`: a top level route outranks the
 * upstream `home` nested under the `/*` app route, so it replaces it without
 * touching the upstream route tables. Both paths share one layout, so moving
 * between the home and the other screens keeps the top bar mounted.
 */
export const PUFFERFIN_APP_ROUTES: RouteObject[] = [
    {
        Component: ConnectionRequired,
        children: [
            {
                lazy: () => import('../AppLayout'),
                children: [
                    {
                        path: HOME_APP_PATH,
                        lazy: () => import('./home')
                    },
                    {
                        path: PUFFERFIN_APP_PATH,
                        children: [
                            {
                                // Former address of the Pufferfin home
                                index: true,
                                element: <Navigate replace to={getHomePath()} />
                            },
                            {
                                // Former address of the sheet of a title on disk: redirects to the one title sheet
                                path: LEGACY_ITEM_ROUTE,
                                lazy: () => import('./item')
                            },
                            {
                                path: 'title/:kind/:id',
                                lazy: () => import('./title')
                            },
                            {
                                path: 'person/:personId',
                                lazy: () => import('./person')
                            },
                            {
                                path: 'library',
                                lazy: () => import('./library')
                            },
                            {
                                path: 'library/:viewId',
                                lazy: () => import('./libraryView')
                            },
                            {
                                path: 'search',
                                lazy: () => import('./search')
                            },
                            {
                                path: 'downloads',
                                lazy: () => import('./downloads')
                            },
                            {
                                path: 'menu',
                                lazy: () => import('./menu')
                            }
                        ]
                    }
                ],
                ErrorBoundary
            }
        ]
    }
];
