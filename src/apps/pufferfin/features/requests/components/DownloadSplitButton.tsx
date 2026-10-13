import { Timer } from 'lucide-react';
import React, { type FC, type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from 'react';

import { useTranslation } from '../../../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../../../navigation/focus';
import { Download, ExpandMore } from '../../../components/icons';

import '../requests.scss';

/** Room the menu needs under the button; with less, it opens above. */
const MENU_ROOM_PX = 180;

interface DownloadSplitButtonProps {
    /** Words of the main part. */
    label: string
    /** The main part: downloads to keep. */
    onDownload: () => void
    /** The option of the menu: downloads for seven days only. */
    onDownloadTemporary: () => void
}

/**
 * Download as a split button: the main part downloads, and only its chevron,
 * set apart by a thin line, opens a small menu with "Download for a while".
 * The menu closes on a choice, on Escape, on a click outside or when the focus
 * leaves it, and gives the focus back to the chevron.
 */
const DownloadSplitButton: FC<DownloadSplitButtonProps> = ({ label, onDownload, onDownloadTemporary }) => {
    const t = useTranslation();
    const menuId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const optionRef = useRef<HTMLButtonElement>(null);
    const [ isOpen, setIsOpen ] = useState(false);
    const [ opensUp, setOpensUp ] = useState(false);

    const close = useCallback((giveFocusBack: boolean) => {
        setIsOpen(false);
        if (giveFocusBack) toggleRef.current?.focus();
    }, []);

    const open = useCallback(() => {
        const rect = toggleRef.current?.getBoundingClientRect();
        setOpensUp(!!rect && window.innerHeight - rect.bottom < MENU_ROOM_PX);
        setIsOpen(true);
    }, []);

    const onToggle = useCallback(() => {
        if (isOpen) close(false);
        else open();
    }, [ close, isOpen, open ]);

    // The option takes the focus as the menu opens, so the keyboard and the remote land in it
    useEffect(() => {
        if (isOpen) optionRef.current?.focus();
    }, [ isOpen ]);

    useEffect(() => {
        if (!isOpen) return;
        const onPointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) close(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [ close, isOpen ]);

    const onToggleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === 'ArrowDown' && !isOpen) {
            event.preventDefault();
            open();
        }
    }, [ isOpen, open ]);

    const onMenuKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close(true);
        } else if (event.key === 'Tab') {
            close(false);
        }
    }, [ close ]);

    const onTemporary = useCallback(() => {
        close(true);
        onDownloadTemporary();
    }, [ close, onDownloadTemporary ]);

    return (
        <div ref={rootRef} className='pf-split'>
            <button
                type='button'
                className='pf-split__main'
                onClick={onDownload}
                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
            >
                <Download className='pf-split__icon' aria-hidden='true' />
                <span>{label}</span>
            </button>
            <span className='pf-split__divider' aria-hidden='true' />
            <button
                ref={toggleRef}
                type='button'
                className='pf-split__toggle'
                aria-label={t('ActionDownloadOptions')}
                title={t('ActionDownloadOptions')}
                aria-haspopup='menu'
                aria-expanded={isOpen}
                aria-controls={isOpen ? menuId : undefined}
                onClick={onToggle}
                onKeyDown={onToggleKeyDown}
                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
            >
                <ExpandMore className='pf-split__chevron' aria-hidden='true' />
            </button>
            {isOpen && (
                // The keys of the menu are handled on its container: Escape and Tab close it
                <div
                    id={menuId}
                    role='menu'
                    tabIndex={-1}
                    aria-label={t('ActionDownloadOptions')}
                    className={opensUp ? 'pf-split__menu pf-split__menu--up' : 'pf-split__menu'}
                    onKeyDown={onMenuKeyDown}
                >
                    <button
                        ref={optionRef}
                        type='button'
                        role='menuitem'
                        className='pf-split__option'
                        onClick={onTemporary}
                        {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                    >
                        <Timer className='pf-split__option-icon' size='1em' aria-hidden='true' focusable='false' />
                        <span className='pf-split__option-text'>
                            <span className='pf-split__option-title'>{t('ActionDownloadTemporary')}</span>
                            <span className='pf-split__option-hint'>{t('ActionDownloadTemporaryHint')}</span>
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default DownloadSplitButton;
