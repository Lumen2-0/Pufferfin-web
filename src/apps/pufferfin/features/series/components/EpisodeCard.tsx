import CloudOutlined from '@mui/icons-material/CloudOutlined';
import Download from '@mui/icons-material/Download';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import React, { type FC } from 'react';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import PosterCard from '../../../components/PosterCard';
import { useTranslation } from '../../../i18n/useTranslation';
import { getCardImageUrl } from '../../../utils/images';
import { getPlayedPercentage } from '../../../utils/items';
import { CatalogAvailability, type CatalogEpisode } from '../../catalog/api/types';
import { type MediaRequest, RequestState } from '../../requests/api/types';
import { getProgressPercent } from '../../requests/utils/requests';
import { getRequestStateText } from '../../requests/utils/status';

interface EpisodeCardProps {
    episode: CatalogEpisode
    /** The library episode, when on disk and read: it brings its image and watch progress. */
    libraryItem?: ItemDto
    /** The request that speaks for a missing episode: see `findEpisodeRequest`. */
    request?: MediaRequest
    /** No news for a while: a download bar must not pass for live progress. */
    isStale: boolean
    /** A missing episode may be requested: Sonarr is enabled and the account may request. */
    canRequest: boolean
    onPlay: (episode: CatalogEpisode) => void
    onRequest: (episode: CatalogEpisode) => void
    onOpenDownloads: () => void
}

type EpisodeCardBaseProps = Pick<EpisodeCardProps, 'episode'> & { title: string, number?: string };

const LibraryEpisodeCard: FC<EpisodeCardBaseProps & Pick<EpisodeCardProps, 'libraryItem' | 'onPlay'>> = ({
    episode, title, number, libraryItem, onPlay
}) => {
    const t = useTranslation();
    const { api } = useApi();
    const progress = libraryItem ? getPlayedPercentage(libraryItem) : undefined;
    const libraryImage = libraryItem && api ? getCardImageUrl(api, libraryItem, 'landscape') : undefined;
    return (
        <PosterCard
            title={title}
            subtitle={number}
            imageUrl={libraryImage ?? episode.StillUrl ?? undefined}
            shape='landscape'
            progress={progress}
            progressLabel={progress ? t('WatchedPercent', progress) : undefined}
            value={episode}
            onSelect={onPlay}
        />
    );
};

type RequestedEpisodeCardProps = EpisodeCardBaseProps & { request: MediaRequest } & Pick<EpisodeCardProps, 'isStale' | 'onOpenDownloads'>;

const RequestedEpisodeCard: FC<RequestedEpisodeCardProps> = ({ episode, title, number, request, isStale, onOpenDownloads }) => {
    const t = useTranslation();
    const isDownloading = request.State === RequestState.Downloading;
    let state = getRequestStateText(request, t);
    if (isDownloading && isStale) state = `${state}, ${t('RequestStale')}`;
    return (
        <PosterCard
            title={title}
            subtitle={number ? `${number}, ${state}` : state}
            imageUrl={episode.StillUrl ?? undefined}
            shape='landscape'
            progress={isDownloading ? getProgressPercent(request) : undefined}
            badge={request.State === RequestState.Failed ?
                { icon: <ErrorOutline fontSize='inherit' />, label: t('RequestFailed') } :
                undefined}
            value={undefined}
            // Cancel and Try Again live in the downloads panel
            onSelect={onOpenDownloads}
        />
    );
};

const MissingEpisodeCard: FC<EpisodeCardBaseProps & Pick<EpisodeCardProps, 'canRequest' | 'onRequest'>> = ({
    episode, title, number, canRequest, onRequest
}) => {
    const t = useTranslation();
    // An episode without a number is a file the library could not number: it cannot be requested
    const isRequestable = canRequest && episode.EpisodeNumber != null;
    return (
        <PosterCard
            title={title}
            subtitle={number}
            imageUrl={episode.StillUrl ?? undefined}
            shape='landscape'
            badge={isRequestable ?
                { icon: <Download fontSize='inherit' />, label: t('ActionDownload') } :
                { icon: <CloudOutlined fontSize='inherit' />, label: t('NotInLibrary') }}
            value={episode}
            onSelect={isRequestable ? onRequest : undefined}
        />
    );
};

/**
 * One episode, in the state the merge gives it: on disk it plays; requested it
 * tells where the request stands and opens the downloads panel; missing it
 * carries a Download badge and is requested when selected, or is a plain tile
 * when it cannot be requested.
 */
const EpisodeCard: FC<EpisodeCardProps> = props => {
    const t = useTranslation();
    const { episode, request } = props;
    const number = episode.EpisodeNumber != null ? t('EpisodeNumber', episode.SeasonNumber, episode.EpisodeNumber) : undefined;
    const title = episode.Title || number || '';

    if (episode.Availability === CatalogAvailability.OnDisk) return <LibraryEpisodeCard {...props} title={title} number={number} />;
    if (request) return <RequestedEpisodeCard {...props} request={request} title={title} number={number} />;
    return <MissingEpisodeCard {...props} title={title} number={number} />;
};

export default EpisodeCard;
