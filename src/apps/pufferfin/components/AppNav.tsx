import classNames from 'classnames';
import React, { type FC } from 'react';
import { NavLink } from 'react-router-dom';

import { useCapabilities } from '../api/useCapabilities';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE, FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import MenuDropdown from '../features/menu/components/MenuDropdown';
import Spotlight from '../features/search/spotlight/Spotlight';
import ContentManagerModal from '../features/contentManager/ContentManagerModal';
import SettingsModal from '../features/settings/SettingsModal';
import { openSpotlight, useIsSpotlightOpen } from '../features/search/spotlight/store';
import { getDownloadsPath, getHomePath, getLibraryPath } from '../routes/paths';
import CastButton from '../shell/CastButton';
import Clock from '../shell/Clock';
import NowPlayingButton from '../shell/NowPlayingButton';
import SyncPlayButton from '../shell/SyncPlayButton';
import BottomBar from '../shell/BottomBar';
import { useCompactLayout } from '../shell/useCompactLayout';
import { Download, Explore, Search, VideoLibrary } from './icons';

// A text tab: quiet at rest, the current screen gets a filled capsule and a heavier label
const getTabClassName = ({ isActive }: { isActive: boolean }) =>
    classNames('pf-nav__tab', { 'pf-nav__tab--current': isActive });

/**
 * The one bar of the interface: at the top on larger screens, at the bottom on
 * phones and upright tablets (see BottomBar). The top bar, on the Pufferfin screens and on the
 * upstream pages alike: the screens as text tabs in a capsule at the center,
 * small round actions at the end. The current screen gets a filled capsule, a
 * heavier label and `aria-current`, so it never relies on color alone.
 */
const AppNav: FC = () => {
    const t = useTranslation();
    const { data: capabilities } = useCapabilities();
    // No download service configured: no Downloads button, rather than an empty panel
    const hasDownloads = !!capabilities?.Radarr || !!capabilities?.Sonarr;
    const isSearchOpen = useIsSpotlightOpen();
    // Phones and upright tablets: the bottom bar alone, nothing at the top
    const isCompact = useCompactLayout();

    if (isCompact) {
        return (
            <>
                <BottomBar hasDownloads={hasDownloads} />
                <Spotlight />
                <SettingsModal />
                <ContentManagerModal />
            </>
        );
    }

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
                {hasDownloads && (
                    <NavLink to={getDownloadsPath()} className={getTabClassName} {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                        <span className='pf-nav__tab-icon' aria-hidden='true'><Download /></span>
                        <span className='pf-nav__tab-label'>{t('NavDownloads')}</span>
                    </NavLink>
                )}
            </span>
            {/* The upstream header entries: player, SyncPlay, cast, then account, dashboard and the other libraries; the clock on TV */}
            <span className='pf-nav__end'>
                {/* Search opens the panel over the current screen, as Spotlight does */}
                <button
                    type='button'
                    className={classNames('pf-button pf-button--quiet pf-button--icon pf-nav__link', { 'pf-button--selected': isSearchOpen })}
                    aria-label={t('NavSearch')}
                    aria-haspopup='dialog'
                    aria-expanded={isSearchOpen}
                    title={`${t('NavSearch')} (⌘K)`}
                    onClick={openSpotlight}
                    {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                >
                    <span className='pf-button__icon' aria-hidden='true'><Search /></span>
                </button>
                <NowPlayingButton />
                <SyncPlayButton />
                <CastButton />
                <MenuDropdown />
                <Clock />
            </span>
            <Spotlight />
            <SettingsModal />
            <ContentManagerModal />
        </nav>
    );
};

export default AppNav;
