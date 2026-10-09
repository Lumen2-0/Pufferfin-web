import classNames from 'classnames';
import React, { type FC, type KeyboardEvent, type MouseEvent, type ReactNode, useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { useTranslation } from '../i18n/useTranslation';
import { Close } from './icons';

import '../features/settings/settings.scss';

interface ModalProps {
    title: string
    /** Small icon before the title. */
    icon?: ReactNode
    onClose: () => void
    /** Extra class of the panel, which sets its size. */
    className?: string
    children: ReactNode
}

/**
 * A window over the page, drawn as the settings one: the page dimmed and
 * blurred, a dark panel with a title and a quiet close button. Escape, the
 * back key of a remote or a click beside the panel closes it.
 */
const Modal: FC<ModalProps> = ({ title, icon, onClose, className, children }) => {
    const t = useTranslation();
    const titleId = useId();
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const root = document.documentElement;
        const previous = root.style.overflow;
        const opener = document.activeElement as HTMLElement | null;
        root.style.overflow = 'hidden';
        closeRef.current?.focus();
        return () => {
            root.style.overflow = previous;
            // The focus goes back to what opened the window
            opener?.focus?.();
        };
    }, []);

    const onKeyDown = useCallback((event: KeyboardEvent) => {
        event.stopPropagation();
        if (event.key === 'Escape' || event.key === 'GoBack' || event.key === 'BrowserBack') {
            event.preventDefault();
            onClose();
        }
    }, [ onClose ]);
    const onBackdrop = useCallback((event: MouseEvent) => {
        if (event.target === event.currentTarget) onClose();
    }, [ onClose ]);

    return createPortal(
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- the backdrop closes on a click; Escape closes from the keyboard
        <div className='pf-settings' onClick={onBackdrop} onKeyDown={onKeyDown}>
            <div className={classNames('pf-settings__panel pf-modal', className)} role='dialog' aria-modal='true' aria-labelledby={titleId}>
                <header className='pf-settings__header'>
                    {icon && <span className='pf-modal__icon' aria-hidden='true'>{icon}</span>}
                    <h3 id={titleId} className='pf-settings__section-title'>{title}</h3>
                    <button ref={closeRef} type='button' className='pf-settings__close' aria-label={t('SettingsClose')} onClick={onClose}>
                        <Close fontSize='inherit' aria-hidden='true' />
                    </button>
                </header>
                <div className='pf-settings__body'>{children}</div>
            </div>
        </div>,
        document.body
    );
};

export default Modal;
