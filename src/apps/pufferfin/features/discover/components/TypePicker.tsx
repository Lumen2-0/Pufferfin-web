import Check from '@mui/icons-material/Check';
import ExpandMore from '@mui/icons-material/ExpandMore';
import classNames from 'classnames';
import React, { type FC, type FocusEvent, type KeyboardEvent, type MouseEvent, useCallback, useEffect, useId, useRef, useState } from 'react';

import { getKeyName } from 'scripts/keyboardNavigation';

import { useTranslation } from '../../../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE, focusElement } from '../../../navigation/focus';
import { DISCOVER_TYPE_LABELS, DISCOVER_TYPES, type DiscoverType } from '../utils/discover';

interface TypePickerProps {
    value: DiscoverType
    onChange: (type: DiscoverType) => void
}

const OPTION_SELECTOR = '[role="option"]';

/**
 * Dropdown of the Discover content types. The list takes the focus when it
 * opens, Up and Down move inside it, Enter picks, Back or Escape closes it,
 * and the focus always returns to the button.
 */
const TypePicker: FC<TypePickerProps> = ({ value, onChange }) => {
    const t = useTranslation();
    const listId = useId();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [ isOpen, setIsOpen ] = useState(false);

    const close = useCallback(() => {
        setIsOpen(false);
        if (buttonRef.current) focusElement(buttonRef.current);
    }, []);

    const onToggle = useCallback(() => {
        setIsOpen(open => !open);
    }, []);

    // Opening moves the focus to the chosen type
    useEffect(() => {
        if (!isOpen || !listRef.current) return;
        const selected = listRef.current.querySelector<HTMLElement>(`${OPTION_SELECTOR}[aria-selected="true"]`)
            ?? listRef.current.querySelector<HTMLElement>(OPTION_SELECTOR);
        if (selected) focusElement(selected);
    }, [ isOpen ]);

    const onPick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        const type = DISCOVER_TYPES.find(option => option === event.currentTarget.dataset.type);
        if (type) onChange(type);
        close();
    }, [ close, onChange ]);

    // Handled here, before the screen navigation: the keys stay inside the open list
    const onListKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
        const key = getKeyName(event.nativeEvent);
        const options = Array.from(listRef.current?.querySelectorAll<HTMLElement>(OPTION_SELECTOR) ?? []);
        const index = options.indexOf(document.activeElement as HTMLElement);

        if (key === 'Back' || key === 'Escape') {
            event.preventDefault();
            close();
        } else if (key === 'ArrowDown' || key === 'ArrowUp') {
            event.preventDefault();
            const next = options[index + (key === 'ArrowDown' ? 1 : -1)];
            if (next) focusElement(next);
        } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
            event.preventDefault();
        }
    }, [ close ]);

    // Leaving the list another way (Tab, a click elsewhere) closes it without moving the focus back
    const onListBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOpen(false);
    }, []);

    return (
        <div className='pf-discover__picker'>
            <button
                ref={buttonRef}
                type='button'
                className='pf-button pf-button--quiet pf-discover__toggle'
                aria-haspopup='listbox'
                aria-expanded={isOpen}
                aria-controls={isOpen ? listId : undefined}
                aria-label={t('DiscoverTypeLabel', t(DISCOVER_TYPE_LABELS[value]))}
                onClick={onToggle}
                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
            >
                <span className='pf-button__label'>{t(DISCOVER_TYPE_LABELS[value])}</span>
                <span className='pf-discover__chevron' aria-hidden='true'><ExpandMore /></span>
            </button>

            {isOpen && (
                <div
                    ref={listRef}
                    id={listId}
                    className='pf-discover__menu'
                    role='listbox'
                    tabIndex={-1}
                    aria-label={t('DiscoverTypePicker')}
                    onKeyDown={onListKeyDown}
                    onBlur={onListBlur}
                >
                    {DISCOVER_TYPES.map(type => {
                        const isSelected = type === value;
                        return (
                            <button
                                key={type}
                                type='button'
                                role='option'
                                aria-selected={isSelected}
                                className={classNames('pf-discover__option', { 'pf-discover__option--selected': isSelected })}
                                data-type={type}
                                onClick={onPick}
                                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                            >
                                {/* The chosen type has a check mark, never color alone */}
                                <span className='pf-discover__check' aria-hidden='true'>{isSelected && <Check />}</span>
                                <span>{t(DISCOVER_TYPE_LABELS[type])}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TypePicker;
