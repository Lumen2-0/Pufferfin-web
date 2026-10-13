import React, { type FC, type MouseEvent, useCallback, useSyncExternalStore } from 'react';

import { episodesControl } from './episodesControl';
import { PANEL_TOGGLE_ATTRIBUTE } from './panelHost';
import { playerText } from './strings';

/** The Episodes button of the player header: shown for an episode, it opens the drawer of its series. */
const EpisodesButton: FC = () => {
    const { isAvailable, isOpen } = useSyncExternalStore(episodesControl.subscribe, episodesControl.getState);

    const onClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        episodesControl.toggle(event.currentTarget);
    }, []);

    if (!isAvailable) return null;

    return (
        <button
            type='button'
            className='pf-osd-top__episodes'
            aria-haspopup='dialog'
            aria-expanded={isOpen}
            onClick={onClick}
            {...{ [PANEL_TOGGLE_ATTRIBUTE]: '' }}
        >
            <svg aria-hidden='true' focusable='false' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.75' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M4 6h16' /><path d='M4 12h16' /><path d='M4 18h10' />
            </svg>
            {playerText('Player.Episodes')}
        </button>
    );
};

export default EpisodesButton;
