import classNames from 'classnames';
import React, { type FC } from 'react';

import { useTranslation } from '../../../i18n/useTranslation';
import { RequestState } from '../api/types';
import { isRequestStale, type DownloadTagState } from '../utils/requests';
import { useNow } from '../utils/useNow';
import { Download, ErrorOutline, WarningAmber } from '../../../components/icons';

interface DownloadTagProps {
    tag: DownloadTagState
    /** When the request list was last read or pushed, to dim a bar that no longer moves. */
    lastSyncAt: number
}

/**
 * Where a download stands, in the shape of the Download button it replaces:
 * the same capsule, its words, and a thin bar along its bottom edge, full
 * width as the download goes, sweeping while the wait has no length yet.
 * Told with words and an icon, never with color alone.
 */
const DownloadTag: FC<DownloadTagProps> = ({ tag, lastSyncAt }) => {
    const t = useTranslation();
    const isDownloading = tag.state === RequestState.Downloading;
    const isFailed = tag.state === RequestState.Failed || tag.state === RequestState.Rejected;
    const now = useNow(isDownloading);
    const isStale = isDownloading && isRequestStale(lastSyncAt, now);
    const isStalled = !!tag.isStalled;
    const isIndeterminate = !isFailed && !isStalled && tag.percent === undefined;

    return (
        <div
            className={classNames('pf-download-tag', {
                'pf-download-tag--failed': isFailed,
                'pf-download-tag--stalled': isStalled,
                'pf-download-tag--stale': isStale
            })}
            role='status'
        >
            <span className='pf-download-tag__icon' aria-hidden='true'>
                {isFailed && <ErrorOutline fontSize='inherit' />}
                {isStalled && <WarningAmber fontSize='inherit' />}
                {!isFailed && !isStalled && <Download fontSize='inherit' />}
            </span>
            <span className='pf-download-tag__label'>{isStale ? `${tag.text} · ${t('RequestStale')}` : tag.text}</span>
            {!isFailed && (
                <span
                    className={classNames('pf-download-tag__track', { 'pf-download-tag__track--indeterminate': isIndeterminate })}
                    role='progressbar'
                    aria-label={t('RequestProgressLabel')}
                    aria-valuemin={isIndeterminate ? undefined : 0}
                    aria-valuemax={isIndeterminate ? undefined : 100}
                    aria-valuenow={isIndeterminate ? undefined : tag.percent}
                >
                    <span className='pf-download-tag__fill' style={isIndeterminate ? undefined : { width: `${tag.percent}%` }} />
                </span>
            )}
        </div>
    );
};

export default DownloadTag;
