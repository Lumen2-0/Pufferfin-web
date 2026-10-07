import React, { type FC } from 'react';

import AppNav from '../components/AppNav';
import { TranslationProvider } from '../i18n/useTranslation';

import '../styles/pufferfin.scss';
import './shell.scss';

/**
 * The Pufferfin bar as it runs on an upstream page: the same AppNav as on the
 * Pufferfin screens, so there is one bar across the whole interface.
 */
const PufferfinShell: FC = () => (
    <TranslationProvider>
        <div className='pf-shell'>
            <AppNav />
        </div>
    </TranslationProvider>
);

export default PufferfinShell;
