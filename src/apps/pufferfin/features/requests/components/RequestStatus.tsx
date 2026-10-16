import classNames from 'classnames';
import React, { type FC } from 'react';

import globalize from 'lib/globalize';

import { useTranslation } from '../../../i18n/useTranslation';
import { RequestState } from '../api/types';
import type { DownloadTagState } from '../utils/requests';
import { getShortEta } from '../utils/temporary';
import { Download, ErrorOutline, WarningAmber } from '../../../components/icons';

import '../requests.scss';

/** States that wait on something with no length yet: a few dots breathe instead of a bar. */
const WAITING_STATES = new Set<RequestState>([
    RequestState.PendingApproval,
    RequestState.Queued,
    RequestState.Searching,
    RequestState.WaitingForSources,
    RequestState.Importing
]);

/** A speed in the units of the language: Ko/s, Mo/s, Go/s in French, KB/s, MB/s, GB/s elsewhere. */
function formatSpeed(bytesPerSecond: number): string {
    const locale = globalize.getCurrentLocale() || undefined;
    const units = locale?.toLowerCase().startsWith('fr') ? [ 'o/s', 'Ko/s', 'Mo/s', 'Go/s' ] : [ 'B/s', 'KB/s', 'MB/s', 'GB/s' ];
    let index = 0;
    let value = bytesPerSecond;
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index++;
    }
    const digits = value < 10 && index > 0 ? 1 : 0;
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value)} ${units[index]}`;
}

interface RequestStatusProps {
    tag: DownloadTagState
    /** A pill the height of the hero buttons, or a line of a downloads card. */
    variant: 'pill' | 'row'
    /** The last news is old: the bar dims and the words say so. */
    isStale?: boolean
}

/**
 * Where a download stands, in the look of the ghost buttons: an icon, or dots
 * that breathe while it waits, its words, and while it downloads a 4px bar with
 * the percentage and the time left. Told with words and an icon, never with color alone.
 */
const RequestStatus: FC<RequestStatusProps> = ({ tag, variant, isStale }) => {
    const t = useTranslation();
    const isDownloading = tag.state === RequestState.Downloading;
    const isFailed = tag.state === RequestState.Failed || tag.state === RequestState.Rejected;
    const isStalled = !!tag.isStalled;
    const isWaiting = WAITING_STATES.has(tag.state);
    const percent = tag.percent ?? 0;
    const showBar = isDownloading && !isStalled;

    const eta = getShortEta(tag.etaSeconds);
    let etaText: string | undefined;
    if (eta?.unit === 'under-minute') etaText = t('RequestEtaShortUnderMinute');
    else if (eta?.unit === 'minutes') etaText = t('RequestEtaShortMinutes', eta.minutes);
    else if (eta?.unit === 'hours') etaText = t('RequestEtaShortHours', eta.hours, String(eta.minutes).padStart(2, '0'));
    const speedText = tag.bytesPerSecond ? formatSpeed(tag.bytesPerSecond) : undefined;
    const meta = showBar ? [ t('RequestPercent', percent), speedText, isStale ? t('RequestStale') : etaText ].filter(Boolean).join(' · ') : undefined;

    return (
        <div
            className={classNames('pf-req-status', `pf-req-status--${variant}`, {
                'pf-req-status--failed': isFailed,
                'pf-req-status--stalled': isStalled,
                'pf-req-status--stale': isStale,
                'pf-req-status--downloading': showBar
            })}
            role='status'
        >
            <span className='pf-req-status__icon' aria-hidden='true'>
                {isWaiting && (
                    <span className='pf-req-status__dots'>
                        <span />
                        <span />
                        <span />
                    </span>
                )}
                {isFailed && <ErrorOutline fontSize='inherit' />}
                {isStalled && <WarningAmber fontSize='inherit' />}
                {isDownloading && !isStalled && <Download fontSize='inherit' />}
            </span>
            <span className='pf-req-status__label'>{tag.label ?? tag.text}</span>
            {showBar && (
                <span
                    className='pf-req-status__bar'
                    role='progressbar'
                    aria-label={t('RequestProgressLabel')}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                >
                    <span className='pf-req-status__fill' style={{ width: `${percent}%` }} />
                </span>
            )}
            {meta && <span className='pf-req-status__meta'>{meta}</span>}
        </div>
    );
};

export default RequestStatus;
