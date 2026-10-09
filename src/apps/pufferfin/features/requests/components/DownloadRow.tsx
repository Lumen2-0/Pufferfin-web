import classNames from 'classnames';
import React, { type FC } from 'react';
import { Link } from 'react-router-dom';

import RoundButton from '../../../components/RoundButton';
import { useTranslation } from '../../../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE, FOCUSABLE_ATTRIBUTE } from '../../../navigation/focus';
import { CatalogItemKind } from '../../catalog/api/types';
import { useAudiobook, useCatalogTitle } from '../../catalog/api/useCatalog';
import { type MediaRequest, RequestKind, RequestState } from '../api/types';
import { getProgressPercent, isRequestCancellable, isRequestStale } from '../utils/requests';
import { getRequestPartText, getRequestProblemLabel, getRequestStateText, getRequestTitlePath, isRequestStalled } from '../utils/status';
import { useNow } from '../utils/useNow';
import { ArrowDownward, ArrowUpward, Block, Check, Close, Refresh, WarningAmber } from '../../../components/icons';

/** Attribute naming the request of a row, so the focus can find the row again after it moved. */
export const REQUEST_ROW_ATTRIBUTE = 'data-pf-request';

const SECONDS_PER_MINUTE = 60;

export interface DownloadRowActions {
    onCancel: (requestId: string) => void
    onRetry: (requestId: string) => void
    onApprove: (requestId: string) => void
    onReject: (requestId: string) => void
    onMoveUp: (requestId: string) => void
    onMoveDown: (requestId: string) => void
}

interface DownloadRowProps {
    request: MediaRequest
    lastSyncAt: number
    /** Shown to administrators for the requests of other users. */
    ownerName?: string
    isAdministrator: boolean
    canMoveUp: boolean
    canMoveDown: boolean
    actions: DownloadRowActions
}

/**
 * The art of a request, read from the catalog sheet of its title (cached):
 * the wide art of a film or a series, the cover of an audiobook.
 */
function useRequestArt(request: MediaRequest): { url?: string, isCover: boolean } {
    const isTitle = request.Kind === RequestKind.Movie || request.Kind === RequestKind.Season || request.Kind === RequestKind.Episode;
    const isAudiobook = request.Kind === RequestKind.Audiobook && !!request.Asin;
    const titleKind = request.Kind === RequestKind.Movie ? CatalogItemKind.Movie : CatalogItemKind.Series;

    const title = useCatalogTitle(titleKind, request.TmdbId, isTitle && request.TmdbId > 0);
    const audiobook = useAudiobook(request.Asin ?? '', undefined, isAudiobook);

    if (isTitle) return { url: title.data?.BackdropUrl ?? title.data?.PosterUrl ?? undefined, isCover: false };
    if (isAudiobook) return { url: audiobook.data?.ImageUrl ?? undefined, isCover: true };
    return { isCover: false };
}

/**
 * One request of the downloads page, as a wide card: the art of the title,
 * its name opening its sheet, where it stands with a thin bar and the time
 * left, and small buttons for what can be done about it. Ordering, approving
 * and refusing are offered to administrators only, and the server checks it again.
 */
const DownloadRow: FC<DownloadRowProps> = ({
    request,
    lastSyncAt,
    ownerName,
    isAdministrator,
    canMoveUp,
    canMoveDown,
    actions
}) => {
    const t = useTranslation();
    const titlePath = getRequestTitlePath(request);
    const art = useRequestArt(request);

    const isDownloading = request.State === RequestState.Downloading;
    const now = useNow(isDownloading);
    const isStale = isDownloading && isRequestStale(lastSyncAt, now);
    const isStalled = isRequestStalled(request);
    const isActive = isRequestCancellable(request) && request.State !== RequestState.Failed;
    const isFailed = request.State === RequestState.Failed || request.State === RequestState.Rejected;
    const percent = getProgressPercent(request);
    const part = getRequestPartText(request, t);
    const problem = getRequestProblemLabel(request);
    const isPendingApproval = request.State === RequestState.PendingApproval;

    let detail: string | undefined;
    if (isStale) {
        detail = t('RequestStale');
    } else if (isDownloading && request.EtaSeconds) {
        const minutes = Math.ceil(request.EtaSeconds / SECONDS_PER_MINUTE);
        detail = minutes <= 1 ? t('RequestEtaUnderMinute') : t('RequestEtaMinutes', minutes);
    }
    const subtitle = [ part, ownerName ? t('DownloadsRequestedBy', ownerName) : undefined ].filter(Boolean).join(' · ');

    return (
        <li
            className={classNames('pf-download', {
                'pf-download--failed': isFailed,
                'pf-download--stalled': isStalled,
                'pf-download--done': !isActive && !isFailed
            })}
            {...{ [REQUEST_ROW_ATTRIBUTE]: request.Id, [FOCUS_GROUP_ATTRIBUTE]: true }}
        >
            <span className={classNames('pf-download__art', { 'pf-download__art--cover': art.isCover })} aria-hidden='true'>
                {art.url && <img src={art.url} alt='' loading='lazy' />}
            </span>

            <div className='pf-download__body'>
                {titlePath ? (
                    <Link to={titlePath} className='pf-download__title' {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                        {request.Title}
                    </Link>
                ) : (
                    <p className='pf-download__title'>{request.Title}</p>
                )}
                {subtitle && <p className='pf-download__subtitle'>{subtitle}</p>}

                <div className='pf-download__state' role='status'>
                    {isStalled && <WarningAmber className='pf-download__state-icon' fontSize='inherit' aria-hidden='true' />}
                    <span className='pf-download__state-text'>{getRequestStateText(request, t)}</span>
                    {detail && <span className='pf-download__detail'>{detail}</span>}
                </div>
                {isActive && (
                    <span
                        className={classNames('pf-download__track', {
                            'pf-download__track--indeterminate': !isDownloading,
                            'pf-download__track--stale': isStale || isStalled
                        })}
                        role='progressbar'
                        aria-label={t('RequestProgressLabel')}
                        aria-valuemin={isDownloading ? 0 : undefined}
                        aria-valuemax={isDownloading ? 100 : undefined}
                        aria-valuenow={isDownloading ? percent : undefined}
                    >
                        <span className='pf-download__fill' style={isDownloading ? { width: `${percent}%` } : undefined} />
                    </span>
                )}
                {problem && <p className='pf-download__problem'>{t(problem)}</p>}
            </div>

            <div className='pf-download__actions'>
                {isAdministrator && isPendingApproval && (
                    <>
                        <RoundButton icon={<Check />} ariaLabel={t('ActionApprove')} value={request.Id} onClick={actions.onApprove} />
                        <RoundButton icon={<Block />} ariaLabel={t('ActionReject')} value={request.Id} onClick={actions.onReject} />
                    </>
                )}
                {request.State === RequestState.Failed && (
                    <RoundButton icon={<Refresh />} ariaLabel={t('ActionRetry')} value={request.Id} onClick={actions.onRetry} />
                )}
                {canMoveUp && (
                    <RoundButton icon={<ArrowUpward />} ariaLabel={t('ActionMoveUp')} value={request.Id} onClick={actions.onMoveUp} />
                )}
                {canMoveDown && (
                    <RoundButton icon={<ArrowDownward />} ariaLabel={t('ActionMoveDown')} value={request.Id} onClick={actions.onMoveDown} />
                )}
                {isRequestCancellable(request) && (
                    <RoundButton icon={<Close />} ariaLabel={t('ActionCancelRequest')} value={request.Id} onClick={actions.onCancel} />
                )}
            </div>
        </li>
    );
};

export default DownloadRow;
