import classNames from 'classnames';
import React, { type ChangeEvent, type FC, type ReactNode, useCallback, useId } from 'react';

import { ExpandMore } from '../../../components/icons';

/**
 * The controls of the settings window, in the manner of shadcn/ui: a label
 * and a quiet description on the left, the control on the right; switches,
 * selects and fields drawn with a hairline, no fill but on the chosen state.
 */

/** One setting: its label, what it does, and its control. */
export const SettingRow: FC<{ label: string, description?: string, htmlFor?: string, children: ReactNode, stacked?: boolean }> = ({
    label, description, htmlFor, children, stacked
}) => (
    <div className={classNames('pf-setting', { 'pf-setting--stacked': stacked })}>
        <div className='pf-setting__text'>
            {htmlFor ? <label className='pf-setting__label' htmlFor={htmlFor}>{label}</label> : <span className='pf-setting__label'>{label}</span>}
            {description && <p className='pf-setting__description'>{description}</p>}
        </div>
        <div className='pf-setting__control'>{children}</div>
    </div>
);

/** On or off, as a small sliding switch. */
export const Switch: FC<{ checked: boolean, onChange: (checked: boolean) => void, label: string, disabled?: boolean }> = ({
    checked, onChange, label, disabled
}) => {
    const onClick = useCallback(() => onChange(!checked), [ checked, onChange ]);
    return (
        <button
            type='button'
            role='switch'
            aria-checked={checked}
            aria-label={label}
            className={classNames('pf-switch', { 'pf-switch--on': checked })}
            onClick={onClick}
            disabled={disabled}
        >
            <span className='pf-switch__thumb' aria-hidden='true' />
        </button>
    );
};

export interface SelectOption {
    value: string
    label: string
}

/** One choice among several: a native select, drawn as a quiet field with a chevron. */
export const Select: FC<{ id?: string, value: string, options: SelectOption[], onChange: (value: string) => void, label?: string, disabled?: boolean }> = ({
    id, value, options, onChange, label, disabled
}) => {
    const onSelect = useCallback((event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value), [ onChange ]);
    return (
        <span className='pf-select'>
            <select id={id} className='pf-select__input' value={value} onChange={onSelect} aria-label={label} disabled={disabled}>
                {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <ExpandMore className='pf-select__chevron' fontSize='inherit' aria-hidden='true' />
        </span>
    );
};

/** A line of text. */
export const TextField: FC<{
    id?: string
    value: string
    onChange: (value: string) => void
    onBlur?: () => void
    type?: 'text' | 'password'
    placeholder?: string
    autoComplete?: string
    label?: string
}> = ({ id, value, onChange, onBlur, type = 'text', placeholder, autoComplete, label }) => {
    const generated = useId();
    const onInput = useCallback((event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value), [ onChange ]);
    return (
        <input
            id={id ?? generated}
            className='pf-input'
            type={type}
            value={value}
            onChange={onInput}
            onBlur={onBlur}
            placeholder={placeholder}
            autoComplete={autoComplete}
            aria-label={label}
            spellCheck={false}
        />
    );
};

/** A button of the window: solid for the action of a form, quiet otherwise. */
export const SettingsButton: FC<{ children: ReactNode, onClick?: () => void, variant?: 'primary' | 'quiet' | 'danger', type?: 'button' | 'submit', disabled?: boolean }> = ({
    children, onClick, variant = 'quiet', type = 'button', disabled
}) => (
    <button type={type} className={classNames('pf-settings-button', `pf-settings-button--${variant}`)} onClick={onClick} disabled={disabled}>
        {children}
    </button>
);

/** A short line under a form: done, or what went wrong. */
export const FormNote: FC<{ tone: 'success' | 'error', children: ReactNode }> = ({ tone, children }) => (
    <p className={classNames('pf-form-note', `pf-form-note--${tone}`)} role={tone === 'error' ? 'alert' : 'status'}>{children}</p>
);
