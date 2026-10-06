import Check from '@mui/icons-material/Check';
import classNames from 'classnames';
import React, { type FC, type MouseEvent, useCallback } from 'react';

import { FOCUS_GROUP_ATTRIBUTE, FOCUSABLE_ATTRIBUTE } from '../navigation/focus';

interface SeasonOption {
    id: string
    name: string
}

interface SeasonPickerProps {
    label: string
    seasons: SeasonOption[]
    selectedId: string | undefined
    onSelect: (id: string) => void
}

/**
 * Row of round toggle buttons, one per season. The selected season is told by
 * `aria-pressed`, a check mark and a solid fill, never by color alone.
 */
const SeasonPicker: FC<SeasonPickerProps> = ({ label, seasons, selectedId, onSelect }) => {
    // One handler for every button: the season id travels in a data attribute
    const onClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        const { seasonId } = event.currentTarget.dataset;
        if (seasonId) onSelect(seasonId);
    }, [ onSelect ]);

    return (
        <div
            className='pf-seasons pf-button-row'
            role='group'
            aria-label={label}
            {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}
        >
            {seasons.map(season => {
                const isSelected = season.id === selectedId;
                return (
                    <button
                        key={season.id}
                        type='button'
                        className={classNames('pf-button', isSelected ? 'pf-button--primary' : 'pf-button--glass')}
                        aria-pressed={isSelected}
                        data-season-id={season.id}
                        onClick={onClick}
                        {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                    >
                        {isSelected && <span className='pf-button__icon' aria-hidden='true'><Check /></span>}
                        <span className='pf-button__label'>{season.name}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default SeasonPicker;
