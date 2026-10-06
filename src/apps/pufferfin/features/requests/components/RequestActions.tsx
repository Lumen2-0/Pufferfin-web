import CloudOutlined from '@mui/icons-material/CloudOutlined';
import Close from '@mui/icons-material/Close';
import Download from '@mui/icons-material/Download';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import Refresh from '@mui/icons-material/Refresh';
import { isAxiosError } from 'axios';
import React, { type FC, type FocusEvent, useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { queryClient } from 'utils/query/queryClient';

import RoundButton from '../../../components/RoundButton';
import { useTranslation } from '../../../i18n/useTranslation';
import { focusFirst } from '../../../navigation/focus';
import { type CreateMediaRequest, type MediaRequest, RequestState } from '../api/types';
import { useChangeRequest, useCreateRequest } from '../api/useRequests';
import { isRequestCancellable } from '../utils/requests';
import { getCreateErrorLabel } from '../utils/status';
import RequestStatus from './RequestStatus';

/**
 * Keeps the focus inside the container when the focused button goes away,
 * as when Download turns into Cancel: the focus moves to the first button
 * left instead of dropping to the page.
 */
export const useFocusFollowsButtons = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const hadFocus = useRef(false);

    const onFocus = useCallback(() => {
        hadFocus.current = true;
    }, []);
    const onBlur = useCallback((event: FocusEvent) => {
        // A null target means the focused button went away: keep the flag to restore the focus
        if (event.relatedTarget && !containerRef.current?.contains(event.relatedTarget as Node)) {
            hadFocus.current = false;
        }
    }, []);

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container || !hadFocus.current) return;
        const active = document.activeElement;
        if (!active || active === document.body) focusFirst(container);
    });

    return { containerRef, onFocus, onBlur };
};

interface RequestActionsProps {
    /** What Download asks for: a movie by TMDB id, an audiobook by ASIN. */
    requestInput: CreateMediaRequest
    /** The current request of the title, if any: see `findMovieRequest` and `findAudiobookRequest`. */
    request?: MediaRequest
    /** The download service is enabled and the account may request: otherwise no Download button is shown. */
    canRequest: boolean
    /** When the request list was last read or pushed, to tell an old state from a live one. */
    lastSyncAt: number
}

/**
 * Download button of a title that is not in the library, then the state of
 * its request with Cancel or Try Again. When the request becomes available,
 * the catalog is read again and the sheet shows what plays it.
 */
const RequestActions: FC<RequestActionsProps> = ({ requestInput, request, canRequest, lastSyncAt }) => {
    const t = useTranslation();
    const { containerRef, onFocus, onBlur } = useFocusFollowsButtons();
    const createRequest = useCreateRequest();
    const changeRequest = useChangeRequest();
    const state = request?.State;

    // Imported: the catalog is read again, finds the library item and the sheet opens its page
    useEffect(() => {
        if (state === RequestState.Available) {
            void queryClient.invalidateQueries({ queryKey: [ 'Pufferfin', 'Catalog' ] });
        }
    }, [ state ]);

    const { isPending: isCreating, mutate: create } = createRequest;
    const onDownload = useCallback(() => {
        // Not disabled while sending: a disabled button would drop the focus
        if (!isCreating) create(requestInput);
    }, [ create, isCreating, requestInput ]);

    const { isPending: isChanging, mutate: change } = changeRequest;
    const onCancel = useCallback((requestId: string) => {
        if (!isChanging) change({ requestId, change: 'Cancel' });
    }, [ change, isChanging ]);
    const onRetry = useCallback((requestId: string) => {
        if (!isChanging) change({ requestId, change: 'Retry' });
    }, [ change, isChanging ]);

    // A refused request may be asked again: the administrator decides again
    const showDownload = canRequest && (!request || state === RequestState.Rejected);
    const createStatus = isAxiosError(createRequest.error) ? createRequest.error.response?.status : undefined;

    return (
        <div ref={containerRef} className='pf-request' onFocus={onFocus} onBlur={onBlur}>
            {request ? (
                <RequestStatus request={request} lastSyncAt={lastSyncAt} />
            ) : (
                <p className='pf-availability'>
                    <CloudOutlined className='pf-availability__icon' fontSize='inherit' aria-hidden='true' />
                    {t('NotInLibrary')}
                </p>
            )}
            <div className='pf-button-row'>
                {showDownload && (
                    <RoundButton
                        variant='primary'
                        icon={<Download />}
                        label={isCreating ? t('Loading') : t('ActionDownload')}
                        onClick={onDownload}
                    />
                )}
                {request && state === RequestState.Failed && (
                    <RoundButton
                        variant='primary'
                        icon={<Refresh />}
                        label={t('ActionRetry')}
                        value={request.Id}
                        onClick={onRetry}
                    />
                )}
                {request && isRequestCancellable(request) && (
                    <RoundButton
                        icon={<Close />}
                        label={t('ActionCancelRequest')}
                        value={request.Id}
                        onClick={onCancel}
                    />
                )}
            </div>
            {createRequest.isError && (
                <p className='pf-row__error' role='alert'>
                    <ErrorOutline aria-hidden='true' />
                    {t(getCreateErrorLabel(createStatus))}
                </p>
            )}
            {changeRequest.isError && (
                <p className='pf-row__error' role='alert'>
                    <ErrorOutline aria-hidden='true' />
                    {t('RequestErrorChange')}
                </p>
            )}
        </div>
    );
};

export default RequestActions;
