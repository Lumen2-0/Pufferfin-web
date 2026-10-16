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
import { getDownloadsPath, getHomePath, getExplorePath, getLibraryPath } from '../routes/paths';
import CastButton from '../shell/CastButton';
import Clock from '../shell/Clock';
import NowPlayingButton from '../shell/NowPlayingButton';
import SyncPlayButton from '../shell/SyncPlayButton';
import RandomButton from '../shell/RandomButton';
import BottomBar from '../shell/BottomBar';
import { useCompactLayout } from '../shell/useCompactLayout';
import DownloadDot from './DownloadDot';
import { Download, Explore, Hub, Search, VideoLibrary } from './icons';

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
/** The name of the app and its mark, three slanted strokes. */
const Brand: FC = () => (
    <NavLink to={getHomePath()} end className='pf-nav__brand' aria-label='Lumen' {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
        <svg className='pf-nav__brand-mark' viewBox='15 15 70 70' aria-hidden='true'>
            <path d='M27 55.5L55.5 27M22.5 77L77 22.5M44.5 73L73 44.5' fill='none' stroke='currentColor' strokeWidth='6' strokeLinecap='round' />
        </svg>
        <span className='pf-nav__brand-name'>Lumen</span>
    </NavLink>
);

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
            {/* Text tabs; on a narrow screen the icon stands for the label, which stays the accessible name */}
            <span className='pf-nav__start'>
                <Brand />
                <span className='pf-nav__tabs'>
                    <NavLink to={getHomePath()} end className={getTabClassName} {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                        <span className='pf-nav__tab-icon' aria-hidden='true'><Explore /></span>
                        <span className='pf-nav__tab-label'>{t('NavDiscover')}</span>
                    </NavLink>
                    <NavLink to={getLibraryPath()} className={getTabClassName} {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                        <span className='pf-nav__tab-icon' aria-hidden='true'><VideoLibrary /></span>
                        <span className='pf-nav__tab-label'>{t('NavLibrary')}</span>
                    </NavLink>
                    <NavLink to={getExplorePath()} className={getTabClassName} {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                        <span className='pf-nav__tab-icon' aria-hidden='true'><Hub /></span>
                        <span className='pf-nav__tab-label'>{t('NavExplore')}</span>
                    </NavLink>
                    {hasDownloads && (
                        <NavLink to={getDownloadsPath()} className={getTabClassName} {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                            <span className='pf-nav__tab-icon' aria-hidden='true'><Download /></span>
                            <span className='pf-nav__tab-label'>{t('NavDownloads')}</span>
                            <DownloadDot />
                        </NavLink>
                    )}
                </span>
            </span>
            {/* Search sits at the center and opens the panel over the current screen, as Spotlight does */}
            <span className='pf-nav__searchbar'>
                <button
                    type='button'
                    className={classNames('pf-nav__search', { 'pf-nav__search--open': isSearchOpen })}
                    aria-label={t('NavSearch')}
                    aria-haspopup='dialog'
                    aria-expanded={isSearchOpen}
                    onClick={openSpotlight}
                    {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                >
                    <span className='pf-nav__search-icon' aria-hidden='true'><Search /></span>
                    <span className='pf-nav__search-text'>{t('SearchPlaceholder')}</span>
                </button>
                <RandomButton />
            </span>
            {/* The upstream header entries: player, SyncPlay, cast, then account, dashboard and the other libraries; the clock on TV */}
            <span className='pf-nav__end'>
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
