import Check from '@mui/icons-material/Check';
import classNames from 'classnames';
import React, { type FC, type MouseEvent, useCallback } from 'react';

import { FOCUS_GROUP_ATTRIBUTE, FOCUSABLE_ATTRIBUTE } from '../navigation/focus';

interface ChoiceOption {
    id: string
    name: string
}

interface ChoicePickerProps {
    label: string
    options: ChoiceOption[]
    selectedId: string | undefined
    onSelect: (id: string) => void
}

/**
 * Row of round toggle buttons, one per choice (a season, a kind of title). The selected one is told by
 * `aria-pressed`, a check mark and a solid fill, never by color alone.
 */
const ChoicePicker: FC<ChoicePickerProps> = ({ label, options, selectedId, onSelect }) => {
    // One handler for every button: the choice id travels in a data attribute
    const onClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        const { choiceId } = event.currentTarget.dataset;
        if (choiceId) onSelect(choiceId);
    }, [ onSelect ]);

    return (
        <div
            className='pf-choices pf-button-row'
            role='group'
            aria-label={label}
            {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}
        >
            {options.map(option => {
                const isSelected = option.id === selectedId;
                return (
                    <button
                        key={option.id}
                        type='button'
                        className={classNames('pf-button', isSelected ? 'pf-button--primary' : 'pf-button--glass')}
                        aria-pressed={isSelected}
                        data-choice-id={option.id}
                        onClick={onClick}
                        {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                    >
                        {isSelected && <span className='pf-button__icon' aria-hidden='true'><Check /></span>}
                        <span className='pf-button__label'>{option.name}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default ChoicePicker;
