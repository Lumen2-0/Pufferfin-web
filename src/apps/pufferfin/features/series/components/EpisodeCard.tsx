import CloudOutlined from '@mui/icons-material/CloudOutlined';
import Download from '@mui/icons-material/Download';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import React, { type FC, type ReactNode, useCallback } from 'react';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import PosterCard from '../../../components/PosterCard';
import type { StringKey } from '../../../i18n/translate';
import { useTranslation } from '../../../i18n/useTranslation';
import { getCardImageUrl } from '../../../utils/images';
import { getPlayedPercentage } from '../../../utils/items';
import { CatalogAvailability, type CatalogEpisode } from '../../catalog/api/types';
import { type MediaRequest, RequestState } from '../../requests/api/types';
import { getProgressPercent } from '../../requests/utils/requests';
import { getRequestStateText } from '../../requests/utils/status';

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
    subtitle?: string
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
    const number = episode.EpisodeNumber != null ? t('EpisodeNumber', episode.SeasonNumber, episode.EpisodeNumber) : undefined;
    const base = { title: episode.Title || number || '', number, stillUrl: episode.StillUrl ?? undefined };

    if (episode.Availability === CatalogAvailability.OnDisk) return getLibraryView(state, base, t);
    if (state.request) return getRequestedView(state.request, state.isStale, base, t);
    return getMissingView(state, base, t);
}

interface ViewBase {
    title: string
    number?: string
    stillUrl?: string
}

function getLibraryView({ libraryItem, libraryImageUrl }: EpisodeCardState, base: ViewBase, t: Translate): EpisodeCardView {
    const progress = libraryItem ? getPlayedPercentage(libraryItem) : undefined;
    return {
        title: base.title,
        subtitle: base.number,
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
        subtitle: base.number ? `${base.number}, ${requestState}` : requestState,
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
        subtitle: base.number,
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
}

/**
 * One episode. Whatever its state, it is the same card element: only its
 * content and action change. So when a missing episode is requested, or a
 * requested one becomes available, the focus stays on it.
 */
const EpisodeCard: FC<EpisodeCardProps> = ({ onSelect, getLibraryImageUrl, ...state }) => {
    const t = useTranslation();
    const view = getEpisodeCardView({
        ...state,
        libraryImageUrl: state.libraryItem ? getLibraryImageUrl(state.libraryItem) : undefined
    }, t);
    const { action } = view;
    const onCardSelect = useCallback((episode: CatalogEpisode) => {
        if (action) onSelect(episode, action);
    }, [ action, onSelect ]);

    return (
        <PosterCard
            title={view.title}
            subtitle={view.subtitle}
            imageUrl={view.imageUrl}
            shape='landscape'
            progress={view.progress}
            progressLabel={view.progressLabel}
            badge={view.badge}
            value={state.episode}
            onSelect={action ? onCardSelect : undefined}
        />
    );
};

/** Landscape library image of an episode, for the cards. */
export const useLibraryImageUrl = () => {
    const { api } = useApi();
    return useCallback((item: ItemDto) => (api ? getCardImageUrl(api, item, 'landscape') : undefined), [ api ]);
};

export default EpisodeCard;
