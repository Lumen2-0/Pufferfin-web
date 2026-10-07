import Download from '@mui/icons-material/Download';
import Explore from '@mui/icons-material/Explore';
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

// A text tab: quiet at rest, the current screen gets a filled capsule and a heavier label
const getTabClassName = ({ isActive }: { isActive: boolean }) =>
    classNames('pf-nav__tab', { 'pf-nav__tab--current': isActive });

// The menu entry sits with the small round actions at the end of the bar
const getActionClassName = ({ isActive }: { isActive: boolean }) =>
    classNames('pf-button', 'pf-button--quiet', 'pf-button--icon', 'pf-nav__link', { 'pf-button--selected': isActive });

/**
 * The one top bar of the interface, on the Pufferfin screens and on the
 * upstream pages alike: the screens as text tabs in a capsule at the center,
 * small round actions at the end. The current screen gets a filled capsule, a
 * heavier label and `aria-current`, so it never relies on color alone.
 */
const AppNav: FC = () => {
    const t = useTranslation();
    const { data: capabilities } = useCapabilities();
    // No download service configured: no Downloads button, rather than an empty panel
    const hasDownloads = !!capabilities?.Radarr || !!capabilities?.Sonarr;

    return (
        <nav className='pf-nav' aria-label={t('NavLabel')} {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}>
            <span className='pf-nav__start' />
            {/* Text tabs; on a narrow screen the icon stands for the label, which stays the accessible name */}
            <span className='pf-nav__tabs'>
                <NavLink to={getHomePath()} end className={getTabClassName} {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                    <span className='pf-nav__tab-icon' aria-hidden='true'><Explore /></span>
                    <span className='pf-nav__tab-label'>{t('NavDiscover')}</span>
                </NavLink>
                <NavLink to={getLibraryPath()} className={getTabClassName} {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                    <span className='pf-nav__tab-icon' aria-hidden='true'><VideoLibrary /></span>
                    <span className='pf-nav__tab-label'>{t('NavLibrary')}</span>
                </NavLink>
                <NavLink to={getSearchPath()} className={getTabClassName} {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                    <span className='pf-nav__tab-icon' aria-hidden='true'><Search /></span>
                    <span className='pf-nav__tab-label'>{t('NavSearch')}</span>
                </NavLink>
                {hasDownloads && (
                    <NavLink to={getDownloadsPath()} className={getTabClassName} {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                        <span className='pf-nav__tab-icon' aria-hidden='true'><Download /></span>
                        <span className='pf-nav__tab-label'>{t('NavDownloads')}</span>
                    </NavLink>
                )}
            </span>
            {/* The upstream header entries: player, SyncPlay, cast, then account, dashboard and the other libraries; the clock on TV */}
            <span className='pf-nav__end'>
                <NowPlayingButton />
                <SyncPlayButton />
                <CastButton />
                <NavLink
                    to={getMenuPath()}
                    className={getActionClassName}
                    aria-label={t('NavMenu')}
                    title={t('NavMenu')}
                    {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                >
                    <span className='pf-button__icon' aria-hidden='true'><MenuIcon /></span>
                </NavLink>
                <Clock />
            </span>
        </nav>
    );
};

export default AppNav;
