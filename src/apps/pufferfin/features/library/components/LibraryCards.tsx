import classNames from 'classnames';
import React, { type FC, useCallback } from 'react';

import type { ItemDto } from 'types/base/models/item-dto';

import { Check, Close, PlayArrow } from '../../../components/icons';
import { useTranslation } from '../../../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../../../navigation/focus';

interface CardProps {
    item: ItemDto
    title: string
    subtitle?: string
    imageUrl?: string
    /** Between 0 and 100. */
    progress?: number
    /** Read with the title, such as "54 % watched". */
    progressLabel?: string
    onOpen: (item: ItemDto) => void
}

const ProgressBar: FC<{ progress: number }> = ({ progress }) => (
    <span className='pf-lib-progress' aria-hidden='true'>
        <span className='pf-lib-progress__fill' style={{ width: `${Math.min(progress, 100)}%` }} />
    </span>
);

/**
 * A poster of the library grid: the art lifts under the pointer, a small round
 * Play shows at its bottom right, a check tells a title already watched. A
 * book is a square cover.
 */
export const LibraryPoster: FC<CardProps & { isPlayed: boolean, isSquare?: boolean, tag?: string, onPlay?: (item: ItemDto) => void }> = ({
    item, title, subtitle, imageUrl, progress, progressLabel, isPlayed, isSquare, tag, onOpen, onPlay
}) => {
    const t = useTranslation();
    const onClick = useCallback(() => onOpen(item), [ item, onOpen ]);
    const onPlayClick = useCallback(() => onPlay?.(item), [ item, onPlay ]);
    const accessibleName = [ title, subtitle, isPlayed ? t('LibraryWatched') : undefined, progressLabel ].filter(Boolean).join(', ');

    return (
        <div className='pf-lib-poster'>
            <button
                type='button'
                className='pf-lib-poster__open'
                aria-label={accessibleName}
                onClick={onClick}
                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
            >
                <span className={classNames('pf-lib-poster__tile', { 'pf-lib-poster__tile--square': isSquare })}>
                    {imageUrl ?
                        <img className='pf-lib-poster__image' src={imageUrl} alt='' loading='lazy' /> :
                        <span className='pf-lib-poster__placeholder' aria-hidden='true'>{title}</span>}
                    {isPlayed && (
                        <span className='pf-lib-poster__seen' aria-hidden='true'>
                            <Check fontSize='inherit' />
                        </span>
                    )}
                    {!!progress && progress > 0 && <ProgressBar progress={progress} />}
                    {tag && <span className='pf-lib-poster__tag' aria-hidden='true'>{tag}</span>}
                </span>
                <span className='pf-lib-poster__caption' aria-hidden='true'>
                    <span className='pf-lib-poster__title'>{title}</span>
                    {subtitle && <span className='pf-lib-poster__subtitle'>{subtitle}</span>}
                </span>
            </button>
            {onPlay && (
                // Over the art, beside the button that opens the title: a button is never in another
                <span className={classNames('pf-lib-poster__overlay', { 'pf-lib-poster__overlay--square': isSquare })}>
                    <button
                        type='button'
                        className='pf-lib-poster__play'
                        aria-label={t('ActionPlayTitle', title)}
                        title={t('ActionPlay')}
                        onClick={onPlayClick}
                        tabIndex={-1}
                    >
                        <PlayArrow fontSize='inherit' aria-hidden='true' />
                    </button>
                </span>
            )}
        </div>
    );
};

/**
 * A card of Resume: a wide still with the progress. Under the pointer a Play
 * triangle shows at its center, and the card plays right away; a cross stops
 * watching it. A book is a square cover of the same height.
 */
export const ResumeCard: FC<Omit<CardProps, 'onOpen'> & {
    isSquare?: boolean
    onPlay: (item: ItemDto) => void
    dismissLabel: string
    onDismiss: (item: ItemDto) => void
}> = ({
    item, title, subtitle, imageUrl, progress, progressLabel, isSquare, onPlay, dismissLabel, onDismiss
}) => {
    const t = useTranslation();
    const onClick = useCallback(() => onPlay(item), [ item, onPlay ]);
    const onDismissClick = useCallback(() => onDismiss(item), [ item, onDismiss ]);
    const accessibleName = [ t('ActionPlayTitle', title), subtitle, progressLabel ].filter(Boolean).join(', ');

    return (
        <div className={classNames('pf-lib-resume', { 'pf-lib-resume--square': isSquare })}>
            <button
                type='button'
                className='pf-lib-resume__open'
                aria-label={accessibleName}
                onClick={onClick}
                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
            >
                <span className='pf-lib-resume__tile'>
                    {imageUrl ?
                        <img className='pf-lib-poster__image' src={imageUrl} alt='' loading='lazy' /> :
                        <span className='pf-lib-poster__placeholder' aria-hidden='true'>{title}</span>}
                    {!!progress && progress > 0 && <ProgressBar progress={progress} />}
                    <span className='pf-lib-resume__play' aria-hidden='true'>
                        <PlayArrow fontSize='inherit' />
                    </span>
                </span>
                <span className='pf-lib-poster__caption' aria-hidden='true'>
                    <span className='pf-lib-poster__title pf-lib-poster__title--one-line'>{title}</span>
                    {subtitle && <span className='pf-lib-poster__subtitle'>{subtitle}</span>}
                </span>
            </button>
            <button
                type='button'
                className='pf-lib-resume__dismiss'
                aria-label={`${dismissLabel}, ${title}`}
                title={dismissLabel}
                onClick={onDismissClick}
                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
            >
                <Close fontSize='inherit' aria-hidden='true' />
            </button>
        </div>
    );
};
