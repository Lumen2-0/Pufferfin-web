import classNames from 'classnames';
import React, { type ReactNode, useCallback } from 'react';

import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';

interface RoundButtonProps<T> {
    /** Solid light button for the one main action, quiet for the others: the focus affirms them. */
    variant?: 'primary' | 'quiet'
    icon?: ReactNode
    /** Visible label. Without it the button is a circle and `ariaLabel` is required. */
    label?: string
    ariaLabel?: string
    /** Passed back to `onClick`, so callers hand over a stable callback instead of a new closure per render. */
    value?: T
    onClick: (value: T) => void
    disabled?: boolean
    /** For a button that turns something on and off, such as a bookmark: whether it is on. */
    pressed?: boolean
}

const RoundButton = <T, >({
    variant = 'quiet',
    icon,
    label,
    ariaLabel,
    value,
    onClick,
    disabled,
    pressed
}: RoundButtonProps<T>) => {
    // Without a value, T is inferred as unknown or undefined: the callback ignores it
    const handleClick = useCallback(() => onClick(value as T), [ onClick, value ]);

    return (
        <button
            type='button'
            className={classNames('pf-button', `pf-button--${variant}`, { 'pf-button--icon': !label })}
            aria-label={label ? undefined : ariaLabel}
            // A circle says what it does under the pointer
            title={label ? undefined : ariaLabel}
            aria-pressed={pressed}
            onClick={handleClick}
            disabled={disabled}
            {...{ [FOCUSABLE_ATTRIBUTE]: true }}
        >
            {icon && <span className='pf-button__icon' aria-hidden='true'>{icon}</span>}
            {label && <span className='pf-button__label'>{label}</span>}
        </button>
    );
};

export default RoundButton;
