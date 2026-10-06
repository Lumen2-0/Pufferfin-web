import classNames from 'classnames';
import React, { type FC } from 'react';

import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import type { CardShape } from '../utils/images';

interface PosterCardProps {
    title: string
    subtitle?: string
    imageUrl?: string
    shape: CardShape
    /** Playback progress between 0 and 100, shown as a bar and announced as text. */
    progress?: number
    progressLabel?: string
    onSelect: () => void
}

const PosterCard: FC<PosterCardProps> = ({
    title,
    subtitle,
    imageUrl,
    shape,
    progress,
    progressLabel,
    onSelect
}) => {
    const accessibleName = [ title, subtitle, progressLabel ].filter(Boolean).join(', ');

    return (
        <button
            type='button'
            className={classNames('pf-card', `pf-card--${shape}`)}
            aria-label={accessibleName}
            onClick={onSelect}
            {...{ [FOCUSABLE_ATTRIBUTE]: true }}
        >
            <span className='pf-card__art'>
                {imageUrl ? (
                    <img className='pf-card__image' src={imageUrl} alt='' loading='lazy' />
                ) : (
                    // No art: the title stands in, on a neutral surface
                    <span className='pf-card__placeholder' aria-hidden='true'>{title}</span>
                )}
                {progress !== undefined && progress > 0 && (
                    <span className='pf-card__progress' aria-hidden='true'>
                        <span className='pf-card__progress-fill' style={{ width: `${Math.min(progress, 100)}%` }} />
                    </span>
                )}
            </span>
            <span className='pf-card__caption' aria-hidden='true'>
                <span className='pf-card__title'>{title}</span>
                {subtitle && <span className='pf-card__subtitle'>{subtitle}</span>}
            </span>
        </button>
    );
};

export default PosterCard;
