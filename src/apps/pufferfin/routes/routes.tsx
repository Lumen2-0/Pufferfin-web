import type { RouteObject } from 'react-router-dom';

import ConnectionRequired from 'components/ConnectionRequired';
import ErrorBoundary from 'components/router/ErrorBoundary';

import { PUFFERFIN_APP_PATH } from './paths';

export const PUFFERFIN_APP_ROUTES: RouteObject[] = [
    {
        Component: ConnectionRequired,
        children: [
            {
                path: PUFFERFIN_APP_PATH,
                lazy: () => import('../AppLayout'),
                children: [
                    {
                        index: true,
                        lazy: () => import('./home')
                    },
                    {
                        path: 'item/:itemId',
                        lazy: () => import('./item')
                    },
                    {
                        path: 'title/:kind/:tmdbId',
                        lazy: () => import('./title')
                    },
                    {
                        path: 'person/:personId',
                        lazy: () => import('./person')
                    },
                    {
                        path: 'search',
                        lazy: () => import('./search')
                    }
                ],
                ErrorBoundary
            }
        ]
    }
];
