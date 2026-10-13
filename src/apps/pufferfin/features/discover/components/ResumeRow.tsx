import type { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import React, { type FC, useCallback } from 'react';

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
    const dismiss = useCallback(() => onDismiss(item), [ item, onDismiss ]);

    return (
        <span className='pf-resume-card'>
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
