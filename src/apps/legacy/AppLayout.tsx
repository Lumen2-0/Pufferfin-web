import React from 'react';
import { Outlet } from 'react-router-dom';

// PUFFERFIN: the Pufferfin bar replaces the upstream header buttons on the user pages
import LegacyShell from 'apps/pufferfin/shell/LegacyShell';
import AppBody from 'components/AppBody';
import CustomCss from 'components/CustomCss';
import ThemeCss from 'components/ThemeCss';

export default function AppLayout() {
    return (
        <>
            <LegacyShell /> {/* PUFFERFIN: one bar across the interface */}
            <AppBody>
                <Outlet />
            </AppBody>
            <ThemeCss />
            <CustomCss />
        </>
    );
}
