import Home from '@mui/icons-material/Home';
import Search from '@mui/icons-material/Search';
import classNames from 'classnames';
import React, { type FC } from 'react';
import { NavLink } from 'react-router-dom';

import { useTranslation } from '../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE, FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import { getSearchPath, PUFFERFIN_APP_PATH } from '../routes/paths';

const getClassName = ({ isActive }: { isActive: boolean }) =>
    classNames('pf-button', 'pf-nav__link', isActive ? 'pf-button--primary' : 'pf-button--glass');

/**
 * Top bar of round glass buttons. The current screen gets a solid fill, a bar
 * under its label and `aria-current`, so it never relies on color alone.
 */
const AppNav: FC = () => {
    const t = useTranslation();

    return (
        <nav className='pf-nav' aria-label={t('NavLabel')} {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}>
            <NavLink to={`/${PUFFERFIN_APP_PATH}`} end className={getClassName} {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                <span className='pf-button__icon' aria-hidden='true'><Home /></span>
                <span className='pf-button__label'>{t('NavHome')}</span>
            </NavLink>
            <NavLink to={getSearchPath()} className={getClassName} {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                <span className='pf-button__icon' aria-hidden='true'><Search /></span>
                <span className='pf-button__label'>{t('NavSearch')}</span>
            </NavLink>
        </nav>
    );
};

export default AppNav;
