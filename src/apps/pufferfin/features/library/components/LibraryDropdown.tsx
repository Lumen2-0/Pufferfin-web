import classNames from 'classnames';
import React, { type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from 'react';

import { Check, ExpandMore } from '../../../components/icons';
import { FOCUSABLE_ATTRIBUTE, focusElement } from '../../../navigation/focus';

export interface DropdownOption<T extends string> {
    id: T
    label: string
}

interface LibraryDropdownProps<T extends string> {
    /** The words of the chip, such as "Films" or "Trier : titre A → Z". */
    label: string
    /** Names the list, and the chip for assistive technologies when its words are not enough. */
    ariaLabel: string
    options: DropdownOption<T>[]
    selectedId: T | undefined
    onSelect: (id: T) => void
    /** The side the list opens toward: under the start of the chip, or under its end at the right of a bar. */
    align?: 'start' | 'end'
    /** A white edge when the chip narrows the grid, as a chosen filter. */
    isActive?: boolean
    /** Whether the chip is read as "<ariaLabel> : <label>"; off when its words already say what it is. */
    isLabelled?: boolean
}

const OPTION_SELECTOR = '.pf-lib-menu__option';

/**
 * A chip that opens a small list under it, one choice checked. A click
 * outside, Escape or a choice closes it; the arrows move through the list.
 */
const LibraryDropdown = <T extends string>({
    label,
    ariaLabel,
    options,
    selectedId,
    onSelect,
    align = 'start',
    isActive,
    isLabelled = true
}: LibraryDropdownProps<T>) => {
    const listId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [ isOpen, setIsOpen ] = useState(false);

    const close = useCallback((restoreFocus: boolean) => {
        setIsOpen(false);
        if (restoreFocus && buttonRef.current) focusElement(buttonRef.current);
    }, []);
    const toggle = useCallback(() => setIsOpen(value => !value), []);

    // Once open, the focus goes to the checked choice; a click outside closes the list
    useEffect(() => {
        if (!isOpen) return;
        const root = rootRef.current;
        const target = root?.querySelector<HTMLElement>(`${OPTION_SELECTOR}[aria-selected="true"]`)
            ?? root?.querySelector<HTMLElement>(OPTION_SELECTOR);
        if (target) focusElement(target);
        const onPointerDown = (event: PointerEvent) => {
            if (!root?.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [ isOpen ]);

    const onKeyDown = useCallback((event: KeyboardEvent) => {
        if (!isOpen) return;
        if (event.key === 'Escape' || event.key === 'GoBack' || event.key === 'BrowserBack') {
            event.preventDefault();
            event.stopPropagation();
            close(true);
            return;
        }
        if (event.key === 'Tab') {
            setIsOpen(false);
            return;
        }
        const items = Array.from(rootRef.current?.querySelectorAll<HTMLElement>(OPTION_SELECTOR) ?? []);
        const index = items.indexOf(document.activeElement as HTMLElement);
        let next: HTMLElement | undefined;
        switch (event.key) {
            case 'ArrowDown':
                next = items[(index + 1) % items.length];
                break;
            case 'ArrowUp':
                next = items[(index - 1 + items.length) % items.length];
                break;
            case 'Home':
                next = items[0];
                break;
            case 'End':
                next = items[items.length - 1];
                break;
            case 'ArrowLeft':
            case 'ArrowRight':
                // The arrows of the page behind stay out while the list is open
                break;
            default:
                return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (next) focusElement(next);
    }, [ close, isOpen ]);

    const choose = useCallback((id: T) => {
        close(true);
        onSelect(id);
    }, [ close, onSelect ]);

    return (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- the keys of the open list are handled around it
        <div ref={rootRef} className='pf-lib-menu' onKeyDown={onKeyDown}>
            <button
                ref={buttonRef}
                type='button'
                className={classNames('pf-lib-chip', { 'pf-lib-chip--active': isActive || isOpen })}
                aria-haspopup='listbox'
                aria-expanded={isOpen}
                aria-controls={isOpen ? listId : undefined}
                aria-label={!isLabelled || label === ariaLabel ? undefined : `${ariaLabel} : ${label}`}
                onClick={toggle}
                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
            >
                <span className='pf-lib-chip__label'>{label}</span>
                <ExpandMore className='pf-lib-chip__chevron' aria-hidden='true' />
            </button>
            {isOpen && (
                <div
                    id={listId}
                    className={classNames('pf-lib-menu__panel', `pf-lib-menu__panel--${align}`)}
                    role='listbox'
                    aria-label={ariaLabel}
                >
                    {options.map(option => (
                        <DropdownItem
                            key={option.id}
                            option={option}
                            isSelected={option.id === selectedId}
                            onChoose={choose}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const DropdownItem = <T extends string>({ option, isSelected, onChoose }: {
    option: DropdownOption<T>
    isSelected: boolean
    onChoose: (id: T) => void
}) => {
    const onClick = useCallback(() => onChoose(option.id), [ onChoose, option.id ]);
    return (
        <button
            type='button'
            role='option'
            aria-selected={isSelected}
            className={classNames('pf-lib-menu__option', { 'pf-lib-menu__option--selected': isSelected })}
            onClick={onClick}
            {...{ [FOCUSABLE_ATTRIBUTE]: true }}
        >
            <span className='pf-lib-menu__label'>{option.label}</span>
            {isSelected && <Check className='pf-lib-menu__check' aria-hidden='true' />}
        </button>
    );
};

export default LibraryDropdown;
