import React, { type FC } from 'react';

import { RequestState } from '../api/types';
import { isRequestStale, type DownloadTagState } from '../utils/requests';
import { useNow } from '../utils/useNow';
import RequestStatus from './RequestStatus';

interface DownloadTagProps {
    tag: DownloadTagState
    /** When the request list was last read or pushed, to dim a bar that no longer moves. */
    lastSyncAt: number
}

/**
 * Where a download stands, in the place of the Download button it replaces: a
 * pill of the same height, its words, and while it downloads its bar with the
 * percentage and the time left.
 */
const DownloadTag: FC<DownloadTagProps> = ({ tag, lastSyncAt }) => {
    const isDownloading = tag.state === RequestState.Downloading;
    const now = useNow(isDownloading);
    const isStale = isDownloading && isRequestStale(lastSyncAt, now);

    return <RequestStatus tag={tag} variant='pill' isStale={isStale} />;
};

export default DownloadTag;
