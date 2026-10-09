import React, { type FC, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCapabilities } from '../../../api/useCapabilities';
import MediaRow from '../../../components/MediaRow';
import PosterCard from '../../../components/PosterCard';
import { useTranslation } from '../../../i18n/useTranslation';
import { type MediaRequest, RequestState } from '../api/types';
import { useMyRequests } from '../api/useRequests';
import { getProgressPercent, isRequestStale, splitRequests } from '../utils/requests';
import { getRequestPartText, getRequestStateText, getRequestTitlePath } from '../utils/status';
import { useNow } from '../utils/useNow';
import { ErrorOutline } from '../../../components/icons';

const getKey = (item: MediaRequest) => item.Id;

/**
 * Home row of the user's downloads still on their way or failed, in queue
 * order. Each card says where its request stands in words, with a bar while
 * downloading, and opens the sheet of its title. The row does not show
 * without a download service, nor when nothing is on its way.
 */
const DownloadsRow: FC = () => {
    const t = useTranslation();
    const navigate = useNavigate();
    const { data: capabilities } = useCapabilities();
    const hasDownloads = !!capabilities?.Radarr || !!capabilities?.Sonarr;
    const requests = useMyRequests();

    const { current } = useMemo(() => splitRequests(requests.data), [ requests.data ]);
    const isDownloading = current.some(item => item.State === RequestState.Downloading);
    const now = useNow(isDownloading);
    const isStale = isRequestStale(requests.dataUpdatedAt, now);

    const openTitle = useCallback((item: MediaRequest) => {
        const path = getRequestTitlePath(item);
        if (path) navigate(path);
    }, [ navigate ]);

    const renderCard = useCallback((item: MediaRequest) => {
        const itemIsDownloading = item.State === RequestState.Downloading;
        // A bar left without news says so, it never passes for live progress
        const state = itemIsDownloading && isStale ?
            `${getRequestStateText(item, t)}, ${t('RequestStale')}` :
            getRequestStateText(item, t);
        const part = getRequestPartText(item, t);
        return (
            <PosterCard
                title={item.Title}
                subtitle={part ? `${part}, ${state}` : state}
                shape='landscape'
                progress={itemIsDownloading ? getProgressPercent(item) : undefined}
                badge={item.State === RequestState.Failed ?
                    { icon: <ErrorOutline fontSize='inherit' />, label: t('RequestFailed') } :
                    undefined}
                value={item}
                onSelect={openTitle}
            />
        );
    }, [ isStale, openTitle, t ]);

    if (!hasDownloads) return null;

    return (
        <MediaRow
            title={t('RowDownloads')}
            shape='landscape'
            items={current}
            // Nothing on its way is the usual case: no skeleton for a row that will most often not show
            isPending={false}
            isError={requests.isError}
            getKey={getKey}
            renderItem={renderCard}
        />
    );
};

export default DownloadsRow;
