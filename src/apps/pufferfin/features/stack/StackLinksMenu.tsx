import classNames from 'classnames';
import { ChevronDown, ExternalLink } from 'lucide-react';
import React, { type FC, useCallback, useId, useState } from 'react';

import { useTranslation } from '../../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../../navigation/focus';
import { useStackLinks } from './useStackLinks';

import './stack.scss';

interface StackLinksMenuProps {
    /** The dropdown of the top bar or the Profile sheet of the bottom bar: each keeps the look of its own items. */
    variant: 'dropdown' | 'sheet'
    /** Called once a page is opened, so the menu can close. */
    onOpen?: () => void
}

/**
 * "Stack arr": an entry of the administration that unfolds the management
 * pages of the stack, each opened in a new tab. Nothing shows when the server
 * has none configured, nor for a user who is not an administrator.
 */
const StackLinksMenu: FC<StackLinksMenuProps> = ({ variant, onOpen }) => {
    const t = useTranslation();
    const listId = useId();
    const { data: links } = useStackLinks();
    const [ isOpen, setIsOpen ] = useState(false);
    const toggle = useCallback(() => setIsOpen(value => !value), []);

    if (!links?.length) return null;

    const itemClass = variant === 'dropdown' ? 'pf-dropdown__item' : 'pf-sheet__item';
    const isMenu = variant === 'dropdown';

    return (
        <li role={isMenu ? 'none' : undefined} className='pf-stack'>
            <button
                type='button'
                role={isMenu ? 'menuitem' : undefined}
                className={classNames(itemClass, 'pf-stack__toggle')}
                aria-expanded={isOpen}
                aria-controls={isOpen ? listId : undefined}
                onClick={toggle}
                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
            >
                <span className='pf-stack__label'>{t('MenuStackArr')}</span>
                <ChevronDown
                    className={classNames('pf-stack__chevron', { 'pf-stack__chevron--open': isOpen })}
                    aria-hidden='true'
                    focusable='false'
                    size='1em'
                />
            </button>
            {isOpen && (
                <ul id={listId} className='pf-stack__list' role={isMenu ? 'menu' : undefined} aria-label={t('MenuStackArr')}>
                    {links.map(link => (
                        <li key={`${link.Name}-${link.Url}`} role={isMenu ? 'none' : undefined}>
                            <a
                                className={classNames(itemClass, 'pf-stack__link')}
                                role={isMenu ? 'menuitem' : undefined}
                                href={link.Url}
                                target='_blank'
                                rel='noopener noreferrer'
                                onClick={onOpen}
                                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                            >
                                <span className='pf-stack__label'>{link.Name}</span>
                                <ExternalLink className='pf-stack__external' aria-hidden='true' focusable='false' size='0.875em' />
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </li>
    );
};

export default StackLinksMenu;
