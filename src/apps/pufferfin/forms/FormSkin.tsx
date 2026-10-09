import React, { type FC, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import PufferfinLogo from '../components/PufferfinLogo';

import { FormSkinKind, getFormSkinKind } from './paths';

import './formSkin.scss';

/** Class on the document element while an upstream form page is served in the Pufferfin style. */
export const FORM_SKIN_CLASS = 'pf-form-skin';

/** Class naming the group of the current form page: settings, public or wizard. */
export const getFormSkinKindClass = (kind: string) => `${FORM_SKIN_CLASS}--${kind}`;

/**
 * Serves the account and settings pages, the public pages and the first run
 * wizard in the Pufferfin style, whatever the layout (modern, legacy, TV).
 * The upstream pages keep their logic and every field; the skin only changes
 * how they look. Dialogs opened from these pages (library creator, alerts)
 * live outside the page element, so the class goes on the document element.
 */
const FormSkin: FC = () => {
    const { pathname } = useLocation();
    const kind = getFormSkinKind(pathname);

    useEffect(() => {
        if (!kind) return;

        const classes = [ FORM_SKIN_CLASS, getFormSkinKindClass(kind) ];
        document.documentElement.classList.add(...classes);
        return () => {
            document.documentElement.classList.remove(...classes);
        };
    }, [ kind ]);

    // The public pages, the first thing a visitor sees, have no bar: they open with the logo.
    // The sign in page opens on its form alone
    const isLogin = /^\/login\/?$/i.test(pathname);
    return kind === FormSkinKind.Public && !isLogin ? <PufferfinLogo className='pf-public-logo' /> : null;
};

export default FormSkin;
