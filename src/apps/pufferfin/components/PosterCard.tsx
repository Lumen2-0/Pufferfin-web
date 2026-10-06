import classNames from 'classnames';
import React, { type ReactNode, useCallback } from 'react';

import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import type { CardShape } from '../utils/images';

interface PosterCardProps<T> {
    title: string
    subtitle?: string
    imageUrl?: string
    shape: CardShape
    /** Playback progress between 0 and 100, shown as a bar and announced as text. */
    progress?: number
    progressLabel?: string
    /** Discreet state on the art, such as a title missing from the library. Told by an icon and words, never by color alone. */
    badge?: { icon: ReactNode, label: string }
    /** Passed back to `onSelect`, so callers hand over a stable callback instead of a new closure per card. */
    value: T
    onSelect: (value: T) => void
}

const PosterCard = <T, >({
    title,
    subtitle,
    imageUrl,
    shape,
    progress,
    progressLabel,
    badge,
    value,
    onSelect
}: PosterCardProps<T>) => {
    const onClick = useCallback(() => onSelect(value), [ onSelect, value ]);
    const accessibleName = [ title, subtitle, progressLabel, badge?.label ].filter(Boolean).join(', ');

    return (
        <button
            type='button'
            className={classNames('pf-card', `pf-card--${shape}`)}
            aria-label={accessibleName}
            onClick={onClick}
            {...{ [FOCUSABLE_ATTRIBUTE]: true }}
        >
            <span className='pf-card__art'>
                {imageUrl ? (
                    <img className='pf-card__image' src={imageUrl} alt='' loading='lazy' />
                ) : (
                    // No art: the title stands in, on a neutral surface
                    <span className='pf-card__placeholder' aria-hidden='true'>{title}</span>
                )}
                {badge && (
                    <span className='pf-card__badge' aria-hidden='true'>
                        <span className='pf-card__badge-icon'>{badge.icon}</span>
                        <span className='pf-card__badge-label'>{badge.label}</span>
                    </span>
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
