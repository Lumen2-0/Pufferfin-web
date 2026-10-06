import ArrowDownward from '@mui/icons-material/ArrowDownward';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import Block from '@mui/icons-material/Block';
import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import Refresh from '@mui/icons-material/Refresh';
import React, { type FC } from 'react';
import { Link } from 'react-router-dom';

import RoundButton from '../../../components/RoundButton';
import { useTranslation } from '../../../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE, FOCUSABLE_ATTRIBUTE } from '../../../navigation/focus';
import { getCatalogTitlePath } from '../../../routes/paths';
import { CatalogItemKind } from '../../catalog/api/types';
import { type MediaRequest, RequestKind, RequestState } from '../api/types';
import { isRequestCancellable } from '../utils/requests';
import RequestStatus from './RequestStatus';

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
 * One request of the downloads panel: the title, opening its sheet, where it
 * stands, and what can be done about it. Ordering, approving and refusing are
 * offered to administrators only, and the server checks it again.
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
    const isMovie = request.Kind === RequestKind.Movie;
    const titlePath = getCatalogTitlePath(isMovie ? CatalogItemKind.Movie : CatalogItemKind.Series, request.TmdbId);

    let part: string | undefined;
    if (request.Kind === RequestKind.Episode && request.SeasonNumber != null && request.EpisodeNumber != null) {
        part = t('EpisodeNumber', request.SeasonNumber, request.EpisodeNumber);
    } else if (request.Kind === RequestKind.Season && request.SeasonNumber != null) {
        part = t('SeasonNumber', request.SeasonNumber);
    }
    const isPendingApproval = request.State === RequestState.PendingApproval;

    return (
        <li
            className='pf-download'
            {...{ [REQUEST_ROW_ATTRIBUTE]: request.Id, [FOCUS_GROUP_ATTRIBUTE]: true }}
        >
            <div className='pf-download__heading'>
                <Link to={titlePath} className='pf-download__title' {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                    {request.Title}
                    {part && <span className='pf-download__part'>{part}</span>}
                </Link>
                {ownerName && <p className='pf-download__owner'>{t('DownloadsRequestedBy', ownerName)}</p>}
            </div>
            <RequestStatus request={request} lastSyncAt={lastSyncAt} />
            <div className='pf-button-row pf-download__actions'>
                {isAdministrator && isPendingApproval && (
                    <>
                        <RoundButton variant='primary' icon={<Check />} label={t('ActionApprove')} value={request.Id} onClick={actions.onApprove} />
                        <RoundButton icon={<Block />} label={t('ActionReject')} value={request.Id} onClick={actions.onReject} />
                    </>
                )}
                {request.State === RequestState.Failed && (
                    <RoundButton variant='primary' icon={<Refresh />} label={t('ActionRetry')} value={request.Id} onClick={actions.onRetry} />
                )}
                {isRequestCancellable(request) && (
                    <RoundButton icon={<Close />} label={t('ActionCancelRequest')} value={request.Id} onClick={actions.onCancel} />
                )}
                {canMoveUp && (
                    <RoundButton icon={<ArrowUpward />} ariaLabel={t('ActionMoveUp')} value={request.Id} onClick={actions.onMoveUp} />
                )}
                {canMoveDown && (
                    <RoundButton icon={<ArrowDownward />} ariaLabel={t('ActionMoveDown')} value={request.Id} onClick={actions.onMoveDown} />
                )}
            </div>
        </li>
    );
};

export default DownloadRow;
