import React, { type FC } from 'react';

import { RequestState } from '../features/requests/api/types';
import { useMyRequests } from '../features/requests/api/useRequests';

/** A blinking white dot next to Downloads while one of the user's downloads is running. */
const DownloadDot: FC<{ className?: string }> = ({ className }) => {
    const { data } = useMyRequests();
    if (!data?.some(request => request.State === RequestState.Downloading)) return null;
    return <span className={className ? `pf-download-dot ${className}` : 'pf-download-dot'} aria-hidden='true' />;
};

export default DownloadDot;
