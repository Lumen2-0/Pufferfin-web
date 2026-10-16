import React, { type FC, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

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

    // The public pages, the first thing a visitor sees, have no bar: they open with the logo
    return kind === FormSkinKind.Public ? (
        <svg className='pf-public-logo' viewBox='15 15 70 70' role='img' aria-label='Lumen'>
            <path d='M27 55.5L55.5 27M22.5 77L77 22.5M44.5 73L73 44.5' fill='none' stroke='currentColor' strokeWidth='6' strokeLinecap='round' />
        </svg>
    ) : null;
};

export default FormSkin;
