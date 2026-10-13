import classNames from 'classnames';
import React, { type FC, type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { useTranslation } from '../../../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE, focusElement } from '../../../navigation/focus';
import { useMenuEntries } from '../useMenuEntries';
import type { MenuEntry } from '../utils/menu';
import { Menu as MenuIcon } from '../../../components/icons';
import StackLinksMenu from '../../stack/StackLinksMenu';

const MenuItem: FC<{ entry: MenuEntry, onChoose: (entry: MenuEntry) => void }> = ({ entry, onChoose }) => {
    const t = useTranslation();
    const onClick = useCallback(() => onChoose(entry), [ entry, onChoose ]);
    return (
        <li role='none'>
            <button
                type='button'
                role='menuitem'
                className={classNames('pf-dropdown__item', { 'pf-dropdown__item--danger': entry.id === 'signOut' })}
                onClick={onClick}
                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
            >
                {t(entry.labelKey)}
            </button>
        </li>
    );
};

/**
 * The menu of the bar, as a small dropdown under its button: the account,
 * then the administration for an administrator. Escape, a click outside or a
 * choice closes it; the arrows move through its entries.
 */
const MenuDropdown: FC = () => {
    const t = useTranslation();
    const { pathname } = useLocation();
    const menuId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [ isOpen, setIsOpen ] = useState(false);
    // The account picture stands for the menu of the account, the three lines without one
    const { userName, avatarUrl, accountEntries, adminEntries, choose } = useMenuEntries();

    const close = useCallback((restoreFocus = false) => {
        setIsOpen(false);
        if (restoreFocus && buttonRef.current) focusElement(buttonRef.current);
    }, []);
    const toggle = useCallback(() => setIsOpen(value => !value), []);
    // A page of the stack opens in a new tab: the menu simply closes
    const closeAfterLink = useCallback(() => setIsOpen(false), []);

    // Another screen closes it
    useEffect(() => setIsOpen(false), [ pathname ]);

    // A click outside closes it; once open, the focus goes to its first entry
    useEffect(() => {
        if (!isOpen) return;
        const first = rootRef.current?.querySelector<HTMLElement>('.pf-dropdown__item');
        if (first) focusElement(first);
        const onPointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [ isOpen ]);

    const onChoose = useCallback((entry: MenuEntry) => {
        setIsOpen(false);
        choose(entry);
    }, [ choose ]);

    const onKeyDown = useCallback((event: KeyboardEvent) => {
        if (!isOpen) return;
        if (event.key === 'Escape' || event.key === 'GoBack' || event.key === 'BrowserBack') {
            event.preventDefault();
            event.stopPropagation();
            close(true);
            return;
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        // The arrows stay in the list, from one entry to the next
        event.preventDefault();
        event.stopPropagation();
        const items = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('.pf-dropdown__item') ?? []);
        const index = items.indexOf(document.activeElement as HTMLElement);
        const next = items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
        if (next) focusElement(next);
    }, [ close, isOpen ]);

    return (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- the keys of the open menu are handled around it
        <div ref={rootRef} className='pf-dropdown' onKeyDown={onKeyDown}>
            <button
                ref={buttonRef}
                type='button'
                className={classNames('pf-button pf-button--quiet pf-button--icon pf-nav__link', { 'pf-button--selected': isOpen })}
                aria-label={t('NavMenu')}
                title={t('NavMenu')}
                aria-haspopup='menu'
                aria-expanded={isOpen}
                aria-controls={isOpen ? menuId : undefined}
                onClick={toggle}
                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
            >
                {avatarUrl ?
                    <img className='pf-nav__avatar' src={avatarUrl} alt='' /> :
                    <span className='pf-button__icon' aria-hidden='true'><MenuIcon /></span>}
            </button>
            {isOpen && (
                <div id={menuId} className='pf-dropdown__panel' role='menu' aria-label={t('NavMenu')}>
                    {userName && <p className='pf-dropdown__header'>{userName}</p>}
                    <ul className='pf-dropdown__list' role='none'>
                        {accountEntries.map(entry => <MenuItem key={entry.id} entry={entry} onChoose={onChoose} />)}
                    </ul>
                    {adminEntries.length > 0 && (
                        <>
                            <p className='pf-dropdown__label'>{t('MenuAdministration')}</p>
                            <ul className='pf-dropdown__list' role='none'>
                                {adminEntries.map(entry => <MenuItem key={entry.id} entry={entry} onChoose={onChoose} />)}
                                <StackLinksMenu variant='dropdown' onOpen={closeAfterLink} />
                            </ul>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default MenuDropdown;
