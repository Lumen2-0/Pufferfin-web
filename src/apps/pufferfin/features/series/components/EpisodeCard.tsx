import classNames from 'classnames';
import React, { type FC, type ReactNode, useCallback } from 'react';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import type { StringKey } from '../../../i18n/translate';
import { useTranslation } from '../../../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../../../navigation/focus';
import { getCardImageUrl } from '../../../utils/images';
import { getPlayedPercentage } from '../../../utils/items';
import { CatalogAvailability, type CatalogEpisode } from '../../catalog/api/types';
import { type MediaRequest, RequestState } from '../../requests/api/types';
import { getProgressPercent } from '../../requests/utils/requests';
import { getRequestStateText } from '../../requests/utils/status';
import { CloudOutlined, Download, ErrorOutline } from '../../../components/icons';
import { CheckIcon, PlayIcon } from '../../details/components/sheetIcons';
import { getRemainingMinutes, splitMinutes } from '../../details/utils/sheet';

type Translate = (key: StringKey, ...args: Array<string | number>) => string;

export interface EpisodeCardState {
    episode: CatalogEpisode
    /** The library episode, when on disk and read: it brings its watch progress. */
    libraryItem?: ItemDto
    /** Its library image, when on disk and read. */
    libraryImageUrl?: string
    /** The request that speaks for a missing episode: see `findEpisodeRequest`. */
    request?: MediaRequest
    /** No news for a while: a download bar must not pass for live progress. */
    isStale: boolean
    /** A missing episode may be requested: Sonarr is enabled and the account may request. */
    canRequest: boolean
}

export type EpisodeAction = 'play' | 'request' | 'openDownloads';

/** What a card shows for an episode in one state, and what selecting it does. */
export interface EpisodeCardView {
    title: string
    /** "E15", on the image. */
    number?: string
    /** "S1, E15", for screen readers. */
    fullNumber?: string
    /** "42 min · Watched", "21 min left", "42 min". */
    subtitle?: string
    /** Watched to the end: the image dims and a check shows. */
    isWatched?: boolean
    imageUrl?: string
    progress?: number
    progressLabel?: string
    badge?: { icon: ReactNode, label: string }
    /** Undefined for a tile with nothing to do. */
    action?: EpisodeAction
}

/**
 * The view of an episode in the state the merge gives it: on disk it plays;
 * requested it tells where the request stands and opens the downloads panel;
 * missing it carries a Download badge and is requested when selected, or is
 * a plain tile when it cannot be requested.
 */
export function getEpisodeCardView(state: EpisodeCardState, t: Translate): EpisodeCardView {
    const { episode } = state;
    const fullNumber = episode.EpisodeNumber != null ? t('EpisodeNumber', episode.SeasonNumber, episode.EpisodeNumber) : undefined;
    const number = episode.EpisodeNumber != null ? t('EpisodeBadge', episode.EpisodeNumber) : undefined;
    const base = {
        title: episode.Title || fullNumber || '',
        number,
        fullNumber,
        stillUrl: episode.StillUrl ?? undefined,
        runtime: getRuntimeText(episode.RuntimeMinutes, t)
    };

    if (episode.Availability === CatalogAvailability.OnDisk) return getLibraryView(state, base, t);
    if (state.request) return getRequestedView(state.request, state.isStale, base, t);
    return getMissingView(state, base, t);
}

interface ViewBase {
    title: string
    number?: string
    fullNumber?: string
    stillUrl?: string
    runtime?: string
}

const TICKS_PER_MINUTE = 600_000_000;

/** "1 h 02 min", "42 min", or nothing for an unknown length. */
function getRuntimeText(minutes: number | null | undefined, t: Translate) {
    if (!minutes || minutes <= 0) return undefined;
    const split = splitMinutes(Math.round(minutes));
    return split.hours ? t('DurationHoursMinutes', split.hours, split.minutes) : t('DurationMinutes', split.minutes);
}

function getLibraryView({ libraryItem, libraryImageUrl }: EpisodeCardState, base: ViewBase, t: Translate): EpisodeCardView {
    const userData = libraryItem?.UserData;
    const isWatched = !!userData?.Played;
    const position = userData?.PlaybackPositionTicks ?? 0;
    const progress = libraryItem && !isWatched ? getPlayedPercentage(libraryItem) : undefined;
    const runtime = libraryItem?.RunTimeTicks ? getRuntimeText(libraryItem.RunTimeTicks / TICKS_PER_MINUTE, t) : base.runtime;

    let subtitle = runtime;
    if (isWatched) {
        subtitle = [ runtime, t('StateWatched') ].filter(Boolean).join(' · ');
    } else if (position > 0) {
        const left = getRemainingMinutes(libraryItem?.RunTimeTicks, position);
        if (left) subtitle = t('TimeLeft', getRuntimeText(left, t) ?? '');
    }

    return {
        title: base.title,
        number: base.number,
        fullNumber: base.fullNumber,
        subtitle,
        isWatched,
        imageUrl: libraryImageUrl ?? base.stillUrl,
        progress,
        progressLabel: progress ? t('WatchedPercent', progress) : undefined,
        action: 'play'
    };
}

function getRequestedView(request: MediaRequest, isStale: boolean, base: ViewBase, t: Translate): EpisodeCardView {
    const isDownloading = request.State === RequestState.Downloading;
    let requestState = getRequestStateText(request, t);
    if (isDownloading && isStale) requestState = `${requestState}, ${t('RequestStale')}`;
    return {
        title: base.title,
        number: base.number,
        fullNumber: base.fullNumber,
        subtitle: requestState,
        imageUrl: base.stillUrl,
        progress: isDownloading ? getProgressPercent(request) : undefined,
        badge: request.State === RequestState.Failed ?
            { icon: <ErrorOutline fontSize='inherit' />, label: t('RequestFailed') } :
            undefined,
        // Cancel and Try Again live in the downloads panel
        action: 'openDownloads'
    };
}

function getMissingView({ episode, canRequest }: EpisodeCardState, base: ViewBase, t: Translate): EpisodeCardView {
    // An episode without a number is a file the library could not number: it cannot be requested
    const isRequestable = canRequest && episode.EpisodeNumber != null;
    return {
        title: base.title,
        number: base.number,
        fullNumber: base.fullNumber,
        subtitle: base.runtime,
        imageUrl: base.stillUrl,
        badge: isRequestable ?
            { icon: <Download fontSize='inherit' />, label: t('ActionDownload') } :
            { icon: <CloudOutlined fontSize='inherit' />, label: t('NotInLibrary') },
        action: isRequestable ? 'request' : undefined
    };
}

interface EpisodeCardProps extends Omit<EpisodeCardState, 'libraryImageUrl'> {
    /** Called with the episode and what selecting its card does in its current state. */
    onSelect: (episode: CatalogEpisode, action: EpisodeAction) => void
    getLibraryImageUrl: (item: ItemDto) => string | undefined
    /** The episode the main button of the series plays: outlined. */
    isCurrent?: boolean
}

/**
 * One episode: its image with its number, a check once watched, its progress
 * when started. Whatever its state, it is the same card element: only its
 * content and action change. So when a missing episode is requested, or a
 * requested one becomes available, the focus stays on it.
 */
const EpisodeCard: FC<EpisodeCardProps> = ({ onSelect, getLibraryImageUrl, isCurrent, ...state }) => {
    const t = useTranslation();
    const view = getEpisodeCardView({
        ...state,
        libraryImageUrl: state.libraryItem ? getLibraryImageUrl(state.libraryItem) : undefined
    }, t);
    const { action } = view;
    const onClick = useCallback(() => {
        if (action) onSelect(state.episode, action);
    }, [ action, onSelect, state.episode ]);

    const accessibleName = [ view.title, view.fullNumber, view.subtitle, view.progressLabel, view.badge?.label ].filter(Boolean).join(', ');
    const className = classNames('pf-episode', {
        'pf-episode--watched': view.isWatched,
        'pf-episode--current': isCurrent && action === 'play'
    });

    const content = (
        <>
            <span className='pf-episode__art'>
                {view.imageUrl ? (
                    <img className='pf-episode__image' src={view.imageUrl} alt='' loading='lazy' />
                ) : (
                    <span className='pf-episode__placeholder'>{view.title}</span>
                )}
                {view.number && <span className='pf-episode__number'>{view.number}</span>}
                {view.isWatched && <span className='pf-episode__seen'><CheckIcon strokeWidth={3} /></span>}
                {view.badge && (
                    <span className='pf-episode__badge'>
                        <span className='pf-episode__badge-icon'>{view.badge.icon}</span>
                        <span className='pf-episode__badge-label'>{view.badge.label}</span>
                    </span>
                )}
                {view.progress !== undefined && view.progress > 0 && (
                    <span className='pf-episode__progress'>
                        <span className='pf-episode__progress-fill' style={{ width: `${Math.min(view.progress, 100)}%` }} />
                    </span>
                )}
                {action === 'play' && <span className='pf-episode__play'><PlayIcon /></span>}
            </span>
            <span className='pf-episode__caption'>
                <span className='pf-episode__title'>{view.title}</span>
                {view.subtitle && <span className='pf-episode__subtitle'>{view.subtitle}</span>}
            </span>
        </>
    );

    if (!action) {
        return (
            <span className={classNames(className, 'pf-episode--static', 'pf-card--static')} role='img' aria-label={accessibleName}>
                <span aria-hidden='true' className='pf-episode__inner'>{content}</span>
            </span>
        );
    }

    return (
        <button
            type='button'
            className={className}
            aria-label={accessibleName}
            onClick={onClick}
            {...{ [FOCUSABLE_ATTRIBUTE]: true }}
        >
            <span aria-hidden='true' className='pf-episode__inner'>{content}</span>
        </button>
    );
};

/** Landscape library image of an episode, for the cards. */
export const useLibraryImageUrl = () => {
    const { api } = useApi();
    return useCallback((item: ItemDto) => (api ? getCardImageUrl(api, item, 'landscape') : undefined), [ api ]);
};

export default EpisodeCard;
