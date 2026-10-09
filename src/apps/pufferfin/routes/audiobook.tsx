import classNames from 'classnames';
import React, { type FC, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import RoundButton from '../components/RoundButton';
import { AlbumSkeleton } from '../components/Skeleton';
import { usePufferfinBook } from '../features/audiobooks/api/usePufferfinBook';
import { getPartTitle } from '../features/audiobooks/utils/audiobooks';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { getCoverUrl } from '../utils/images';
import { getPlayedPercentage, getRuntime, isResumable } from '../utils/items';
import { getStartPart, playAudiobookParts } from '../utils/playback';
import { Check, ErrorOutline, PlayArrow } from '../components/icons';

const COVER_WIDTH = 800;

type Translate = ReturnType<typeof useTranslation>;

function formatLength(ticks: number | null | undefined, t: Translate): string | undefined {
    const runtime = getRuntime(ticks);
    if (!runtime) return undefined;
    return runtime.hours ? t('DurationHoursMinutes', runtime.hours, runtime.minutes) : t('DurationMinutes', runtime.minutes);
}

interface PartRowProps {
    part: ItemDto
    index: number
    bookName: string
    onPlay: (index: number) => void
}

/** One part of the book, as a track of an album: its number, its name, its length. Played from here on. */
const PartRow: FC<PartRowProps> = ({ part, index, bookName, onPlay }) => {
    const t = useTranslation();
    const onClick = useCallback(() => onPlay(index), [ index, onPlay ]);
    const progress = getPlayedPercentage(part);
    const isPlayed = !!part.UserData?.Played;
    const title = getPartTitle(part.Name ?? '', bookName, index);
    const length = formatLength(part.RunTimeTicks, t);
    const state = isPlayed ? t('PartPlayed') : progress && t('ListenedPercent', progress);

    const marker = isPlayed ?
        <Check className='pf-tracks__check' fontSize='inherit' /> :
        <span className='pf-tracks__number'>{index + 1}</span>;

    return (
        <li className='pf-tracks__item'>
            <button
                type='button'
                className={classNames('pf-tracks__row', { 'pf-tracks__row--played': isPlayed })}
                aria-label={[ title, length, state ].filter(Boolean).join(', ')}
                onClick={onClick}
                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
            >
                <span className='pf-tracks__marker' aria-hidden='true'>
                    {marker}
                    <PlayArrow className='pf-tracks__play' fontSize='inherit' />
                </span>
                <span className='pf-tracks__title' aria-hidden='true'>
                    {title}
                    {!isPlayed && progress ? (
                        <span className='pf-tracks__progress'>
                            <span className='pf-tracks__progress-fill' style={{ width: `${progress}%` }} />
                        </span>
                    ) : null}
                </span>
                <span className='pf-tracks__length' aria-hidden='true'>{length}</span>
            </button>
        </li>
    );
};

/**
 * Page of an audiobook of the library, laid out as a music album: the cover,
 * the title, the authors and the length, Play or Resume, then every part of
 * the book as a track, each playable from where the user stopped in it.
 * Playback just starts, with no loader.
 */
export const AudiobookDetails: FC<{ itemId: string }> = ({ itemId }) => {
    const t = useTranslation();
    const { api } = useApi();
    const pageRef = useRef<HTMLDivElement>(null);
    const { data, isPending, isError } = usePufferfinBook(itemId);

    useInitialFocus(pageRef, [ data ], !!data);

    const book = data?.Book;
    const parts = useMemo(() => data?.Parts ?? [], [ data ]);
    const startIndex = getStartPart(parts);
    const isStarted = parts.some(part => part.UserData?.Played || isResumable(part));

    const onPlayBook = useCallback(() => {
        void playAudiobookParts(parts, getStartPart(parts));
    }, [ parts ]);
    const onPlayPart = useCallback((index: number) => {
        void playAudiobookParts(parts, index);
    }, [ parts ]);

    if (isPending) return <AlbumSkeleton />;

    if (isError || !book) {
        return (
            <div className='pf-status' role='status'>
                <ErrorOutline aria-hidden='true' />
                <p>{t('ItemLoadError')}</p>
            </div>
        );
    }

    const coverUrl = api ? getCoverUrl(api, [ book, ...parts ], COVER_WIDTH) : undefined;
    const progress = getPlayedPercentage(book);
    const facts = [
        parts.length > 1 ? t('PartCount', parts.length) : undefined,
        formatLength(book.RunTimeTicks, t),
        book.ProductionYear ? String(book.ProductionYear) : undefined,
        progress && !book.UserData?.Played ? t('ListenedPercent', progress) : undefined
    ].filter((value): value is string => !!value);

    let playLabel = t('ActionPlay');
    if (isStarted && parts.length > 1) playLabel = t('ActionResumePart', startIndex + 1);
    else if (isStarted) playLabel = t('ActionResume');

    return (
        <div ref={pageRef} className='pf-album'>
            <header className='pf-album__header'>
                <div className='pf-album__cover'>
                    {coverUrl ? (
                        <img className='pf-album__image' src={coverUrl} alt='' />
                    ) : (
                        <span className='pf-album__placeholder' aria-hidden='true'>{book.Name}</span>
                    )}
                </div>

                <div className='pf-album__text'>
                    <h1 className='pf-album__title'>{book.Name}</h1>
                    {book.AlbumArtist && <p className='pf-album__authors'>{book.AlbumArtist}</p>}
                    {facts.length > 0 && <p className='pf-album__facts'>{facts.join(' · ')}</p>}
                    <div className='pf-button-row pf-album__actions'>
                        <RoundButton
                            variant='primary'
                            icon={<PlayArrow />}
                            label={playLabel}
                            onClick={onPlayBook}
                        />
                    </div>
                    {book.Overview && <p className='pf-album__overview'>{book.Overview}</p>}
                </div>
            </header>

            {parts.length > 0 && (
                <section className='pf-album__parts' aria-labelledby='pf-album-parts'>
                    <h2 id='pf-album-parts' className='pf-row__title pf-album__parts-title'>{t('SectionParts')}</h2>
                    <ol className='pf-tracks'>
                        {parts.map((part, index) => (
                            <PartRow
                                key={part.Id ?? index}
                                part={part}
                                index={index}
                                bookName={book.Name ?? ''}
                                onPlay={onPlayPart}
                            />
                        ))}
                    </ol>
                </section>
            )}
        </div>
    );
};

export const Component = () => {
    const { itemId } = useParams();
    return itemId ? <AudiobookDetails key={itemId} itemId={itemId} /> : null;
};

Component.displayName = 'PufferfinAudiobookPage';
