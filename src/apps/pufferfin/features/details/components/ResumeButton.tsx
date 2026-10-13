import classNames from 'classnames';
import React, { useCallback } from 'react';

import { FOCUSABLE_ATTRIBUTE } from '../../../navigation/focus';
import { PlayIcon } from './sheetIcons';

/** What the button shows once open: the film or the episode it plays, and where it stands. */
export interface ResumeCard {
    imageUrl?: string
    /** Watched share, 0 to 100. */
    progress?: number
    /** "Film · 2022", "Season 1 · Episode 15". */
    kicker: string
    title: string
    /** "1 h 11 min left". */
    detail?: string
}

interface ResumeButtonProps<T> {
    /** "Resume at 31:12", "Play S1, E1". */
    label: string
    /** The whole sentence for screen readers: what plays and how much is left. */
    ariaLabel?: string
    /** Without it the button stays a pill: there is nothing more to show. */
    card?: ResumeCard
    value: T
    onClick: (value: T) => void
    disabled?: boolean
}

/**
 * The main action of a sheet: a white pill. Under the pointer or the focus it
 * grows from its bottom left corner into a card of what it plays, over the
 * buttons beside it, while its place in the row stays the pill.
 */
const ResumeButton = <T, >({ label, ariaLabel, card, value, onClick, disabled }: ResumeButtonProps<T>) => {
    const handleClick = useCallback(() => onClick(value), [ onClick, value ]);
    const progress = card?.progress ? Math.min(100, Math.max(0, card.progress)) : 0;

    const labelContent = (
        <>
            <span className='pf-resume__icon'><PlayIcon /></span>
            {label}
        </>
    );

    return (
        <div className={classNames('pf-resume', { 'pf-resume--card': !!card })}>
            {/* The pill's size in the row: the button itself floats over it */}
            <span className='pf-resume__label pf-resume__sizer' aria-hidden='true'>{labelContent}</span>
            <button
                type='button'
                className='pf-resume__button'
                aria-label={ariaLabel ?? label}
                onClick={handleClick}
                disabled={disabled}
                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
            >
                <span className='pf-resume__label' aria-hidden='true'>{labelContent}</span>
                {card && (
                    <span className='pf-resume__card' aria-hidden='true'>
                        <span className='pf-resume__thumb'>
                            {card.imageUrl && <img src={card.imageUrl} alt='' />}
                            {progress > 0 && (
                                <span className='pf-resume__track'>
                                    <span className='pf-resume__fill' style={{ width: `${progress}%` }} />
                                </span>
                            )}
                        </span>
                        <span className='pf-resume__text'>
                            <span className='pf-resume__kicker'>{card.kicker}</span>
                            <span className='pf-resume__title'>{card.title}</span>
                            {card.detail && <span className='pf-resume__detail'>{card.detail}</span>}
                        </span>
                    </span>
                )}
            </button>
        </div>
    );
};

export default ResumeButton;
