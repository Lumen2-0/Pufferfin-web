import classNames from 'classnames';
import React, { type ReactNode, useCallback } from 'react';

import { useTranslation } from '../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import type { CardShape } from '../utils/images';
import { PlayArrow } from './icons';

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
    /** Without it, the card is a plain tile: shown, read by screen readers, but not a focus stop with nothing to do. */
    onSelect?: (value: T) => void
    /**
     * For a title on disk: a small round Play shows at the bottom right of the
     * art under the pointer, and plays without opening the page.
     */
    onPlay?: (value: T) => void
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
    onSelect,
    onPlay
}: PosterCardProps<T>) => {
    const t = useTranslation();
    const onClick = useCallback(() => onSelect?.(value), [ onSelect, value ]);
    const onPlayClick = useCallback(() => onPlay?.(value), [ onPlay, value ]);
    const accessibleName = [ title, subtitle, progressLabel, badge?.label ].filter(Boolean).join(', ');

    const content = (
        <>
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
        </>
    );

    if (!onSelect) {
        return (
            <span className={classNames('pf-card', `pf-card--${shape}`, 'pf-card--static')} role='img' aria-label={accessibleName}>
                {content}
            </span>
        );
    }

    const card = (
        <button
            type='button'
            className={classNames('pf-card', `pf-card--${shape}`)}
            aria-label={accessibleName}
            onClick={onClick}
            {...{ [FOCUSABLE_ATTRIBUTE]: true }}
        >
            {content}
        </button>
    );

    if (!onPlay) return card;

    // Two buttons side by side, not one in the other: the card opens the page, Play plays
    return (
        <span className={classNames('pf-card-play', `pf-card-play--${shape}`)}>
            {card}
            <span className='pf-card-play__zone'>
                <button
                    type='button'
                    className='pf-card-play__button'
                    aria-label={t('ActionPlayTitle', title)}
                    title={t('ActionPlay')}
                    onClick={onPlayClick}
                    tabIndex={-1}
                >
                    <PlayArrow fontSize='inherit' aria-hidden='true' />
                </button>
            </span>
        </span>
    );
};

export default PosterCard;
