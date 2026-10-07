import { ThemeProvider } from '@mui/material/styles';
import React from 'react';
import {
    RouterProvider,
    createHashRouter,
    Outlet,
    useLocation
} from 'react-router-dom';

import { DASHBOARD_APP_PATHS, DASHBOARD_APP_ROUTES } from 'apps/dashboard/routes/routes';
import { APP_ROUTES as MODERN_APP_ROUTES } from 'apps/modern/routes/routes';
import { APP_ROUTES as LEGACY_APP_ROUTES } from 'apps/legacy/routes/routes';
import { WIZARD_APP_ROUTES } from 'apps/wizard/routes/routes';
// PUFFERFIN: Pufferfin interface routes
import { PUFFERFIN_APP_ROUTES } from 'apps/pufferfin/routes/routes';
import { isPufferfinPath } from 'apps/pufferfin/routes/paths';
// PUFFERFIN: account, settings, public pages and wizard in the Pufferfin style
import FormSkin from 'apps/pufferfin/forms/FormSkin';
// PUFFERFIN: every playback screen and shared dialog in the Pufferfin style
import PlaybackSkin from 'apps/pufferfin/features/player/PlaybackSkin';
import AppHeader from 'components/AppHeader';
import Backdrop from 'components/Backdrop';
import layoutManager from 'components/layoutManager';
import BangRedirect from 'components/router/BangRedirect';
import { createRouterHistory } from 'components/router/routerHistory';
import appTheme from 'themes';
import { ThemeStorageManager } from 'themes/themeStorageManager';

const router = createHashRouter([
    {
        element: <RootAppLayout />,
        children: [
            ...(layoutManager.modern ? MODERN_APP_ROUTES : LEGACY_APP_ROUTES),
            ...DASHBOARD_APP_ROUTES,
            ...WIZARD_APP_ROUTES,
            ...PUFFERFIN_APP_ROUTES, // PUFFERFIN: mount the Pufferfin interface
            {
                path: '!/*',
                Component: BangRedirect
            }
        ]
    }
]);

export const history = createRouterHistory(router);

export default function RootAppRouter() {
    return <RouterProvider router={router} />;
}

/**
 * Layout component that renders legacy components required on all pages.
 * NOTE: The app will crash if these get removed from the DOM.
 */
function RootAppLayout() {
    const location = useLocation();
    const isNewLayoutPath = Object.values(DASHBOARD_APP_PATHS)
        .some(path => location.pathname.startsWith(`/${path}`))
        || isPufferfinPath(location.pathname); // PUFFERFIN: the Pufferfin interface has no upstream header

    return (
        <ThemeProvider
            theme={appTheme}
            defaultMode='dark'
            storageManager={ThemeStorageManager}
        >
            <Backdrop />
            <FormSkin /> {/* PUFFERFIN: Pufferfin style on the upstream form pages */}
            <PlaybackSkin /> {/* PUFFERFIN: the player skin applies to any playback, whatever its origin */}
            <AppHeader isHidden={layoutManager.modern || isNewLayoutPath} />

            <Outlet />
        </ThemeProvider>
    );
}
