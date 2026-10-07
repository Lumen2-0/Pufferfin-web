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
import CastButton from '../shell/CastButton';
import Clock from '../shell/Clock';
import NowPlayingButton from '../shell/NowPlayingButton';
import SyncPlayButton from '../shell/SyncPlayButton';

// Quiet at rest, the focus affirms; the current screen gets a firmer outline and a bar under its label
const getClassName = ({ isActive }: { isActive: boolean }) =>
    classNames('pf-button', 'pf-button--quiet', 'pf-nav__link', { 'pf-button--selected': isActive });

/**
 * The one top bar of the interface, on the Pufferfin screens and on the
 * upstream pages alike. The current screen gets a firmer outline, a bar under
 * its label and `aria-current`, so it never relies on color alone.
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
            {/* The upstream header entries: player, SyncPlay, cast, then account, dashboard and the other libraries; the clock on TV */}
            <span className='pf-nav__end'>
                <NowPlayingButton />
                <SyncPlayButton />
                <CastButton />
                <NavLink to={getMenuPath()} className={getClassName} {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                    <span className='pf-button__icon' aria-hidden='true'><MenuIcon /></span>
                    <span className='pf-button__label'>{t('NavMenu')}</span>
                </NavLink>
                <Clock />
            </span>
        </nav>
    );
};

export default AppNav;
