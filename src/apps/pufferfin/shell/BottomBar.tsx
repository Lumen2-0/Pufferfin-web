import classNames from 'classnames';
import React, { type FC, type ReactNode, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';

import { useTranslation } from '../i18n/useTranslation';
import { openSpotlight, useIsSpotlightOpen } from '../features/search/spotlight/store';
import { getDownloadsPath, getHomePath, getLibraryPath } from '../routes/paths';
import ProfileSheet from './ProfileSheet';
import { DiscoverIcon, DownloadsIcon, LibraryIcon, ProfileIcon, SearchIcon } from './tabIcons';

import './compact.scss';

const getTabClassName = ({ isActive }: { isActive: boolean }) =>
    classNames('pf-tabbar__tab', { 'pf-tabbar__tab--current': isActive });

const TabContent: FC<{ icon: ReactNode, label: string }> = ({ icon, label }) => (
    <>
        <span className='pf-tabbar__icon'>{icon}</span>
        <span className='pf-tabbar__label'>{label}</span>
    </>
);

/**
 * Phones and upright tablets: the screens in a bar at the bottom, in reach of
 * the thumb, and nothing at the top. Search opens its panel, Profile a sheet
 * with the account, SyncPlay and cast. The current tab is white with a heavier
 * label and `aria-current`, never color alone.
 */
const BottomBar: FC<{ hasDownloads: boolean }> = ({ hasDownloads }) => {
    const t = useTranslation();
    const isSearchOpen = useIsSpotlightOpen();
    const [ isProfileOpen, setIsProfileOpen ] = useState(false);
    const openProfile = useCallback(() => setIsProfileOpen(true), []);
    const closeProfile = useCallback(() => setIsProfileOpen(false), []);

    return createPortal(
        <>
            <nav className='pf-tabbar' aria-label={t('NavLabel')}>
                <NavLink to={getHomePath()} end className={getTabClassName}>
                    <TabContent icon={<DiscoverIcon />} label={t('NavDiscover')} />
                </NavLink>
                <NavLink to={getLibraryPath()} className={getTabClassName}>
                    <TabContent icon={<LibraryIcon />} label={t('NavLibrary')} />
                </NavLink>
                <button
                    type='button'
                    className={classNames('pf-tabbar__tab', { 'pf-tabbar__tab--current': isSearchOpen })}
                    aria-haspopup='dialog'
                    aria-expanded={isSearchOpen}
                    onClick={openSpotlight}
                >
                    <TabContent icon={<SearchIcon />} label={t('NavSearchTab')} />
                </button>
                {hasDownloads && (
                    <NavLink to={getDownloadsPath()} className={getTabClassName}>
                        <TabContent icon={<DownloadsIcon />} label={t('NavDownloads')} />
                    </NavLink>
                )}
                <button
                    type='button'
                    className={classNames('pf-tabbar__tab', { 'pf-tabbar__tab--current': isProfileOpen })}
                    aria-haspopup='dialog'
                    aria-expanded={isProfileOpen}
                    onClick={openProfile}
                >
                    <TabContent icon={<ProfileIcon />} label={t('NavProfile')} />
                </button>
            </nav>
            <ProfileSheet isOpen={isProfileOpen} onClose={closeProfile} />
        </>,
        document.body
    );
};

export default BottomBar;
