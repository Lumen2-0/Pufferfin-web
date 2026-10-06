import Download from '@mui/icons-material/Download';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import HourglassEmpty from '@mui/icons-material/HourglassEmpty';
import LibraryAddCheck from '@mui/icons-material/LibraryAddCheck';
import classNames from 'classnames';
import React, { type FC } from 'react';

import { useTranslation } from '../../../i18n/useTranslation';
import { type MediaRequest, RequestState } from '../api/types';
import { getProgressPercent, isRequestStale } from '../utils/requests';
import { getRequestProblemLabel, getRequestStateText } from '../utils/status';
import { useNow } from '../utils/useNow';

const SECONDS_PER_MINUTE = 60;

const StateIcon: FC<{ state: RequestState }> = ({ state }) => {
    switch (state) {
        case RequestState.Failed:
        case RequestState.Rejected:
            return <ErrorOutline className='pf-availability__icon' fontSize='inherit' aria-hidden='true' />;
        case RequestState.Available:
            return <LibraryAddCheck className='pf-availability__icon' fontSize='inherit' aria-hidden='true' />;
        case RequestState.Downloading:
            return <Download className='pf-availability__icon' fontSize='inherit' aria-hidden='true' />;
        default:
            return <HourglassEmpty className='pf-availability__icon' fontSize='inherit' aria-hidden='true' />;
    }
};

interface RequestStatusProps {
    request: MediaRequest
    /** When the request list was last read or pushed, to tell an old state from a live one. */
    lastSyncAt: number
}

/**
 * Where a request stands, told with an icon and words, never with color
 * alone. While downloading, a bar and the time left; when no news came for a
 * while, the bar dims and the words say so, so it never passes for live progress.
 */
const RequestStatus: FC<RequestStatusProps> = ({ request, lastSyncAt }) => {
    const t = useTranslation();
    const isDownloading = request.State === RequestState.Downloading;
    const now = useNow(isDownloading);
    const isStale = isDownloading && isRequestStale(lastSyncAt, now);
    const percent = getProgressPercent(request);
    const problem = getRequestProblemLabel(request);

    const stateText = getRequestStateText(request, t);

    let detail: string | undefined;
    if (isStale) {
        detail = t('RequestStale');
    } else if (isDownloading && request.EtaSeconds) {
        const minutes = Math.ceil(request.EtaSeconds / SECONDS_PER_MINUTE);
        detail = minutes <= 1 ? t('RequestEtaUnderMinute') : t('RequestEtaMinutes', minutes);
    }

    return (
        <div className='pf-request__state' role='status'>
            <p className='pf-availability'>
                <StateIcon state={request.State} />
                {stateText}
            </p>
            {isDownloading && (
                <div
                    className={classNames('pf-request__bar', { 'pf-request__bar--stale': isStale })}
                    role='progressbar'
                    aria-label={t('RequestProgressLabel')}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    aria-valuetext={detail ? `${stateText}, ${detail}` : stateText}
                >
                    <span className='pf-request__bar-fill' style={{ width: `${percent}%` }} />
                </div>
            )}
            {detail && <p className='pf-request__detail'>{detail}</p>}
            {problem && <p className='pf-request__detail'>{t(problem)}</p>}
        </div>
    );
};

export default RequestStatus;
