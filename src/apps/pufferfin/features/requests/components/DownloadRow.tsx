import classNames from 'classnames';
import { Timer } from 'lucide-react';
import React, { type FC } from 'react';
import { Link } from 'react-router-dom';

import RoundButton from '../../../components/RoundButton';
import { useTranslation } from '../../../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE, FOCUSABLE_ATTRIBUTE } from '../../../navigation/focus';
import { CatalogItemKind } from '../../catalog/api/types';
import { useAudiobook, useCatalogTitle } from '../../catalog/api/useCatalog';
import { type MediaRequest, RequestKind, RequestState } from '../api/types';
import { isRequestCancellable, isRequestStale, summarizeRequests } from '../utils/requests';
import { getTemporaryState, type TemporaryState } from '../utils/temporary';
import { getRequestPartText, getRequestProblemLabel, getRequestStateText, getRequestTitlePath, isRequestStalled } from '../utils/status';
import RequestStatus from './RequestStatus';
import { useNow } from '../utils/useNow';
import { ArrowDownward, ArrowUpward, Block, Check, Close, Refresh } from '../../../components/icons';

/** Attribute naming the request of a row, so the focus can find the row again after it moved. */
export const REQUEST_ROW_ATTRIBUTE = 'data-pf-request';

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

/** The words of the temporary chip of a downloads card. */
function getTemporaryText(state: TemporaryState, t: ReturnType<typeof useTranslation>): string {
    switch (state.kind) {
        case 'until':
            return state.daysLeft <= 1 ? t('TemporaryLastDay') : t('TemporaryDaysLeft', state.daysLeft);
        case 'kept':
            return t('TemporaryKept');
        default:
            return t('RequestTemporary');
    }
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
    const part = getRequestPartText(request, t);
    const problem = getRequestProblemLabel(request);
    const isPendingApproval = request.State === RequestState.PendingApproval;
    // On its way or failed: the status with its bar; finished: its words only
    const tag = summarizeRequests([ request ], t);
    const temporary = getTemporaryState(request, Date.now());
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

                {tag ? (
                    <RequestStatus tag={tag} variant='row' isStale={isStale} />
                ) : (
                    <div className='pf-download__state' role='status'>
                        <span className='pf-download__state-text'>
                            {temporary?.kind === 'removed' ? t('TemporaryRemoved') : getRequestStateText(request, t)}
                        </span>
                    </div>
                )}
                {temporary && (
                    <span className='pf-download__temporary'>
                        <Timer className='pf-temporary-note__icon' size='1em' aria-hidden='true' focusable='false' />
                        {getTemporaryText(temporary, t)}
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
