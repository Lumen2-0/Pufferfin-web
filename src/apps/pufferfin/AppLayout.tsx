import React, { useCallback, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { clearBackdrop } from 'components/backdrop/backdrop';

import { TranslationProvider } from './i18n/useTranslation';
import { useSpatialNavigation } from './navigation/useSpatialNavigation';
import { PUFFERFIN_APP_PATH } from './routes/paths';

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

    // Back leaves the current screen; on the Pufferfin home it falls through to the upstream handler
    const onBack = useCallback(() => {
        if (location.pathname === `/${PUFFERFIN_APP_PATH}`) return false;
        navigate(-1);
        return true;
    }, [ location.pathname, navigate ]);

    useSpatialNavigation(rootRef, onBack);

    return (
        <TranslationProvider>
            <div ref={rootRef} className='pf-app'>
                <main className='pf-app__main'>
                    <Outlet />
                </main>
            </div>
        </TranslationProvider>
    );
};

Component.displayName = 'PufferfinAppLayout';
