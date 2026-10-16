import type { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import classNames from 'classnames';
import React, { type FC, useCallback, useEffect, useRef, useState } from 'react';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import MediaRow from '../../../components/MediaRow';
import { Close } from '../../../components/icons';
import { useTranslation } from '../../../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../../../navigation/focus';
import { getCardImageUrl } from '../../../utils/images';
import { getDisplayTitle, getEpisodeNumbers, getPlayedPercentage, getRuntime } from '../../../utils/items';
import { usePlayItem } from '../../../utils/usePlay';
import { useDismissResume, useResumeItems } from '../../home/api/useHomeRows';

// Under the pointer: after 3 seconds the film plays in the card, with its sound; 5 seconds after it
// really runs, the full player opens. A film that cannot play in the card opens after the fallback.
const PREVIEW_DELAY_MS = 3000;
const PREVIEW_RUN_MS = 5000;
const FALLBACK_DELAY_MS = PREVIEW_DELAY_MS + 8000;

const getKey = (item: ItemDto) => item.Id ?? '';

/** The bare triangle drawn over the art under the pointer: it plays, it does not open. */
const PlayTriangle: FC = () => (
    <svg className='pf-resume-card__triangle' viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
        <path d='M7 4.5v15l13-7.5z' fill='currentColor' />
    </svg>
);

interface ResumeCardProps {
    item: ItemDto
    onPlay: (item: ItemDto) => void
    onDismiss: (item: ItemDto) => void
}

/**
 * A wide card of a title being watched: the still, the progress, the title and
 * what is left. The whole card plays where it stopped; a cross takes it out.
 */
const ResumeCard: FC<ResumeCardProps> = ({ item, onPlay, onDismiss }) => {
    const t = useTranslation();
    const { api } = useApi();
    const title = getDisplayTitle(item);
    const progress = getPlayedPercentage(item);

    const numbers = getEpisodeNumbers(item);
    const left = getRuntime((item.RunTimeTicks ?? 0) - (item.UserData?.PlaybackPositionTicks ?? 0));
    let leftText: string | undefined;
    if (left) {
        const duration = left.hours ? t('DurationHoursMinutes', left.hours, left.minutes) : t('DurationMinutes', left.minutes);
        leftText = t('TimeLeft', duration);
    }
    const subtitle = [ numbers ? t('EpisodeNumber', numbers[0], numbers[1]) : undefined, leftText ].filter(Boolean).join(' · ');
    const imageUrl = api ? getCardImageUrl(api, item, 'landscape') : undefined;

    const play = useCallback(() => onPlay(item), [ item, onPlay ]);

    const [ isStarting, setIsStarting ] = useState(false);
    const [ isPreviewing, setIsPreviewing ] = useState(false);
    const timers = useRef<number[]>([]);
    const hasRun = useRef(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const stopHover = useCallback(() => {
        hasRun.current = false;
        // A removed video keeps downloading the whole film until it is let go: it would fight the player for the line
        videoRef.current?.removeAttribute('src');
        videoRef.current?.load();
        for (const timer of timers.current) window.clearTimeout(timer);
        timers.current = [];
        setIsStarting(false);
        setIsPreviewing(false);
    }, []);
    const openPlayer = useCallback(() => {
        stopHover();
        // Before any click on the page the browser refuses a film with sound: the player would start without ever showing
        if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
        onPlay(item);
    }, [ item, onPlay, stopHover ]);
    const startHover = useCallback(() => {
        stopHover();
        timers.current = [
            window.setTimeout(() => setIsStarting(true), PREVIEW_DELAY_MS),
            window.setTimeout(openPlayer, FALLBACK_DELAY_MS)
        ];
    }, [ openPlayer, stopHover ]);
    useEffect(() => stopHover, [ stopHover ]);

    // The film runs in the card: the clock of the full player starts now, the fallback one is dropped
    const onPreviewPlaying = useCallback(() => {
        // Once: a freeze that recovers fires "playing" again and must not push the opening back
        if (hasRun.current || !timers.current.length) return;
        hasRun.current = true;
        window.clearTimeout(timers.current[1]);
        timers.current = [ timers.current[0], window.setTimeout(openPlayer, PREVIEW_RUN_MS) ];
        setIsPreviewing(true);
    }, [ openPlayer ]);
    // A film the browser cannot read or loses: the still comes back, the fallback opens the player
    const onPreviewError = useCallback(() => {
        setIsStarting(false);
        setIsPreviewing(false);
    }, []);
    // With its sound; a browser that refuses sound without a click plays it muted instead
    const onPreviewReady = useCallback((event: React.SyntheticEvent<HTMLVideoElement>) => {
        const video = event.currentTarget;
        if (!video.paused) return;
        video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => undefined);
        });
    }, []);

    // The film itself, from where it stopped. A format the browser cannot read leaves the still in place
    const startSeconds = Math.floor((item.UserData?.PlaybackPositionTicks ?? 0) / 10000000);
    const previewUrl = isStarting && api?.accessToken && item.Id ?
        `${api.basePath}/Videos/${item.Id}/stream?static=true&api_key=${encodeURIComponent(api.accessToken)}#t=${startSeconds}` :
        undefined;
    const dismiss = useCallback(() => onDismiss(item), [ item, onDismiss ]);

    return (
        <span className={classNames('pf-resume-card', { 'pf-resume-card--starting': isStarting, 'pf-resume-card--previewing': isPreviewing })} onMouseEnter={startHover} onMouseLeave={stopHover}>
            <button
                type='button'
                className='pf-resume-card__open'
                aria-label={[ t('ActionPlayTitle', title), subtitle ].filter(Boolean).join(', ')}
                onClick={play}
                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
            >
                <span className='pf-resume-card__art'>
                    {imageUrl ? (
                        <img className='pf-resume-card__image' src={imageUrl} alt='' loading='lazy' />
                    ) : (
                        <span className='pf-resume-card__placeholder' aria-hidden='true'>{title}</span>
                    )}
                    {previewUrl && (
                        // A few seconds of the film as a preview: nothing to caption
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        <video ref={videoRef} className='pf-resume-card__video' src={previewUrl} playsInline preload='auto' aria-hidden='true' tabIndex={-1} onCanPlay={onPreviewReady} onPlaying={onPreviewPlaying} onError={onPreviewError} />
                    )}
                    <span className='pf-resume-card__shade' aria-hidden='true' />
                    <PlayTriangle />
                    {progress !== undefined && (
                        <span className='pf-resume-card__progress' aria-hidden='true'>
                            <span className='pf-resume-card__fill' style={{ width: `${progress}%` }} />
                        </span>
                    )}
                </span>
                <span className='pf-resume-card__caption' aria-hidden='true'>
                    <span className='pf-resume-card__title'>{title}</span>
                    {subtitle && <span className='pf-resume-card__subtitle'>{subtitle}</span>}
                </span>
            </button>
            <button
                type='button'
                className='pf-resume-card__dismiss'
                aria-label={`${t('ActionStopWatching')}, ${title}`}
                title={t('ActionStopWatching')}
                onClick={dismiss}
                onMouseEnter={stopHover}
                onMouseLeave={startHover}
                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
            >
                <Close fontSize='inherit' aria-hidden='true' />
            </button>
        </span>
    );
};

/** What is being watched, as wide cards that play straight away. */
const ResumeRow: FC<{ itemTypes?: BaseItemKind[] }> = ({ itemTypes }) => {
    const t = useTranslation();
    const playItem = usePlayItem();
    const resume = useResumeItems(itemTypes);
    const dismissResume = useDismissResume();
    const dismiss = useCallback((item: ItemDto) => {
        if (item.Id) dismissResume.mutate(item.Id);
    }, [ dismissResume ]);

    const renderItem = useCallback((item: ItemDto) => (
        <ResumeCard item={item} onPlay={playItem} onDismiss={dismiss} />
    ), [ dismiss, playItem ]);

    return (
        <div className='pf-resume-row'>
            <MediaRow
                title={t('RowContinueWatching')}
                shape='landscape'
                items={resume.data}
                isPending={resume.isPending}
                isError={resume.isError}
                getKey={getKey}
                renderItem={renderItem}
            />
        </div>
    );
};

export default ResumeRow;
