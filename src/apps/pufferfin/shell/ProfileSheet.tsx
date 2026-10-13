import classNames from 'classnames';
import React, { type FC, type KeyboardEvent, useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { useTranslation } from '../i18n/useTranslation';
import { useMenuEntries } from '../features/menu/useMenuEntries';
import type { MenuEntry } from '../features/menu/utils/menu';
import { useIsSyncPlayOpen } from '../features/syncplay/SyncPlayModal';
import { FOCUSABLE_ATTRIBUTE, focusElement } from '../navigation/focus';
import CastButton from './CastButton';
import NowPlayingButton from './NowPlayingButton';
import SyncPlayButton from './SyncPlayButton';
import { ProfileIcon } from './tabIcons';

interface ProfileSheetProps {
    isOpen: boolean
    onClose: () => void
}

/**
 * The Profile tab of the bottom bar: a sheet from the bottom with the account,
 * the playing audio, SyncPlay and cast, then the entries of the account menu.
 * It stays mounted while closed, inert: SyncPlay and cast keep their windows
 * and menus, which open from its buttons.
 */
const ProfileSheet: FC<ProfileSheetProps> = ({ isOpen, onClose }) => {
    const t = useTranslation();
    const titleId = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    const openerRef = useRef<HTMLElement | null>(null);
    const { userName, avatarUrl, accountEntries, adminEntries, choose } = useMenuEntries();
    const isSyncPlayOpen = useIsSyncPlayOpen();

    // Open: the focus moves into the sheet; closed: back to what opened it
    useEffect(() => {
        if (!isOpen) return;
        openerRef.current = document.activeElement as HTMLElement | null;
        const first = panelRef.current?.querySelector<HTMLElement>('button');
        if (first) focusElement(first);
        return () => {
            openerRef.current?.focus?.();
        };
    }, [ isOpen ]);

    // The SyncPlay window takes the screen: the sheet gives way to it
    useEffect(() => {
        if (isSyncPlayOpen) onClose();
    }, [ isSyncPlayOpen, onClose ]);

    const onChoose = useCallback((entry: MenuEntry) => {
        onClose();
        choose(entry);
    }, [ choose, onClose ]);

    const onKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape' || event.key === 'GoBack' || event.key === 'BrowserBack') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
        }
    }, [ onClose ]);

    return createPortal(
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Escape closes the sheet from anywhere inside it
        <div
            className={classNames('pf-sheet', { 'pf-sheet--open': isOpen })}
            onKeyDown={onKeyDown}
            // Closed, nothing in it takes the focus or the pointer
            {...(isOpen ? {} : { inert: '' })}
        >
            <button
                type='button'
                className='pf-sheet__scrim'
                aria-label={t('SettingsClose')}
                tabIndex={-1}
                onClick={onClose}
            />
            <div
                ref={panelRef}
                className='pf-sheet__panel'
                role='dialog'
                aria-modal='true'
                aria-labelledby={titleId}
                aria-hidden={!isOpen}
            >
                <span className='pf-sheet__grip' aria-hidden='true' />
                <header className='pf-sheet__header'>
                    <span className='pf-sheet__avatar' aria-hidden='true'>
                        {avatarUrl ? <img src={avatarUrl} alt='' /> : <ProfileIcon />}
                    </span>
                    <h2 id={titleId} className='pf-sheet__title'>{userName ?? t('NavProfile')}</h2>
                </header>
                {/* What plays now, SyncPlay and cast: the round buttons of the top bar */}
                <div className='pf-sheet__quick'>
                    <NowPlayingButton />
                    <SyncPlayButton />
                    <CastButton />
                </div>
                <ul className='pf-sheet__list'>
                    {accountEntries.map(entry => (
                        <SheetItem key={entry.id} entry={entry} onChoose={onChoose} />
                    ))}
                </ul>
                {adminEntries.length > 0 && (
                    <>
                        <p className='pf-sheet__label'>{t('MenuAdministration')}</p>
                        <ul className='pf-sheet__list'>
                            {adminEntries.map(entry => (
                                <SheetItem key={entry.id} entry={entry} onChoose={onChoose} />
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
};

const SheetItem: FC<{ entry: MenuEntry, onChoose: (entry: MenuEntry) => void }> = ({ entry, onChoose }) => {
    const t = useTranslation();
    const onClick = useCallback(() => onChoose(entry), [ entry, onChoose ]);
    return (
        <li>
            <button
                type='button'
                className={classNames('pf-sheet__item', { 'pf-sheet__item--danger': entry.id === 'signOut' })}
                onClick={onClick}
                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
            >
                {t(entry.labelKey)}
            </button>
        </li>
    );
};

export default ProfileSheet;
