import React, { useCallback, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { clearBackdrop } from 'components/backdrop/backdrop';
import viewManager from 'components/viewManager/viewManager';

import AppNav from './components/AppNav';
import { useLiveRequests } from './features/requests/api/useLiveRequests';
import { TranslationProvider } from './i18n/useTranslation';
import { useSpatialNavigation } from './navigation/useSpatialNavigation';
import { getHomePath } from './routes/paths';

import './styles/pufferfin.scss';

/**
 * Root of the Pufferfin interface: black full screen surface, its own scroll
 * container, and arrow key navigation for everything inside.
 */
export const Component = () => {
    const rootRef = useRef<HTMLDivElement>(null);
    const location = useLocation();
    const navigate = useNavigate();

    // The upstream backdrop would show behind the black surface on some screens
    useEffect(() => {
        clearBackdrop(true);
    }, []);

    // A Pufferfin screen closes the upstream view left open, as the upstream pages do: the video
    // player stops its playback when its view hides, else it plays on, unseen, after leaving it
    useEffect(() => {
        viewManager.hideView();
    }, [ location.pathname ]);

    // Each screen starts at the top: the scroll container outlives the routes
    useEffect(() => {
        if (rootRef.current) rootRef.current.scrollTop = 0;
    }, [ location.pathname ]);

    // Back leaves the current screen; on the Pufferfin home it falls through to the upstream handler
    const onBack = useCallback(() => {
        if (location.pathname === getHomePath()) return false;
        navigate(-1);
        return true;
    }, [ location.pathname, navigate ]);

    useSpatialNavigation(rootRef, onBack);

    // Request progress is pushed while any Pufferfin screen is open
    useLiveRequests();

    return (
        <TranslationProvider>
            <div ref={rootRef} className='pf-app'>
                <AppNav />
                <main className='pf-app__main'>
                    <Outlet />
                </main>
            </div>
        </TranslationProvider>
    );
};

Component.displayName = 'PufferfinAppLayout';
