import Download from '@mui/icons-material/Download';
import Home from '@mui/icons-material/Home';
import MenuIcon from '@mui/icons-material/Menu';
import VideoLibrary from '@mui/icons-material/VideoLibrary';
import Search from '@mui/icons-material/Search';
import classNames from 'classnames';
import React, { type FC } from 'react';
import { NavLink } from 'react-router-dom';

import { useCapabilities } from '../api/useCapabilities';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE, FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import { getDownloadsPath, getHomePath, getLibraryPath, getMenuPath, getSearchPath } from '../routes/paths';

const getClassName = ({ isActive }: { isActive: boolean }) =>
    classNames('pf-button', 'pf-nav__link', isActive ? 'pf-button--primary' : 'pf-button--glass');

// The menu sits apart, at the end of the bar (wins over the spacing between links)
const getMenuClassName = (state: { isActive: boolean }) => classNames(getClassName(state), 'pf-nav__link--end');

/**
 * Top bar of round glass buttons. The current screen gets a solid fill, a bar
 * under its label and `aria-current`, so it never relies on color alone.
 */
const AppNav: FC = () => {
    const t = useTranslation();
    const { data: capabilities } = useCapabilities();
    // No download service configured: no Downloads button, rather than an empty panel
    const hasDownloads = !!capabilities?.Radarr || !!capabilities?.Sonarr;

    return (
        <nav className='pf-nav' aria-label={t('NavLabel')} {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}>
            <NavLink to={getHomePath()} end className={getClassName} {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                <span className='pf-button__icon' aria-hidden='true'><Home /></span>
                <span className='pf-button__label'>{t('NavHome')}</span>
            </NavLink>
            <NavLink to={getLibraryPath()} className={getClassName} {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                <span className='pf-button__icon' aria-hidden='true'><VideoLibrary /></span>
                <span className='pf-button__label'>{t('NavLibrary')}</span>
            </NavLink>
            <NavLink to={getSearchPath()} className={getClassName} {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                <span className='pf-button__icon' aria-hidden='true'><Search /></span>
                <span className='pf-button__label'>{t('NavSearch')}</span>
            </NavLink>
            {hasDownloads && (
                <NavLink to={getDownloadsPath()} className={getClassName} {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                    <span className='pf-button__icon' aria-hidden='true'><Download /></span>
                    <span className='pf-button__label'>{t('NavDownloads')}</span>
                </NavLink>
            )}
            {/* Account, dashboard and the other Jellyfin sections: the upstream header is hidden here */}
            <NavLink to={getMenuPath()} className={getMenuClassName} {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                <span className='pf-button__icon' aria-hidden='true'><MenuIcon /></span>
                <span className='pf-button__label'>{t('NavMenu')}</span>
            </NavLink>
        </nav>
    );
};

export default AppNav;
