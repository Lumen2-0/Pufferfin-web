import classNames from 'classnames';
import React, { type FC, type ReactNode } from 'react';

import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';

interface RoundButtonProps {
    /** Solid light button for the main action, glass for the others. */
    variant?: 'primary' | 'glass'
    icon?: ReactNode
    /** Visible label. Without it the button is a circle and `ariaLabel` is required. */
    label?: string
    ariaLabel?: string
    onClick: () => void
    disabled?: boolean
}

const RoundButton: FC<RoundButtonProps> = ({
    variant = 'glass',
    icon,
    label,
    ariaLabel,
    onClick,
    disabled
}) => (
    <button
        type='button'
        className={classNames('pf-button', `pf-button--${variant}`, { 'pf-button--icon': !label })}
        aria-label={label ? undefined : ariaLabel}
        onClick={onClick}
        disabled={disabled}
        {...{ [FOCUSABLE_ATTRIBUTE]: true }}
    >
        {icon && <span className='pf-button__icon' aria-hidden='true'>{icon}</span>}
        {label && <span className='pf-button__label'>{label}</span>}
    </button>
);

export default RoundButton;
