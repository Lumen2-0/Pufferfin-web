import { isAxiosError } from 'axios';
import React, { type FC, type FocusEvent, type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { queryClient } from 'utils/query/queryClient';

import RoundButton from '../../../components/RoundButton';
import { useTranslation } from '../../../i18n/useTranslation';
import { focusFirst } from '../../../navigation/focus';
import { type CreateMediaRequest, type MediaRequest, RequestState } from '../api/types';
import { useChangeRequest, useCreateRequest } from '../api/useRequests';
import { isOver, isRequestCancellable, summarizeRequests } from '../utils/requests';
import { getCreateErrorLabel, getRequestProblemLabel } from '../utils/status';
import DownloadSplitButton from './DownloadSplitButton';
import DownloadTag from './DownloadTag';
import { Close, Download, ErrorOutline, Refresh } from '../../../components/icons';

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
    /** What Download asks for: a movie by TMDB id, an audiobook by ASIN, or every season of a series. */
    requestInput: CreateMediaRequest | CreateMediaRequest[]
    /** The current request of the title, if any, or every request of a series. */
    request?: MediaRequest | MediaRequest[]
    /** The download service is enabled and the account may request: otherwise no Download button is shown. */
    canRequest: boolean
    /** When the request list was last read or pushed, to tell an old state from a live one. */
    lastSyncAt: number
    /** Words of the Download button, such as Download all seasons. */
    downloadLabel?: string
    /** Download is a split button whose menu also offers to download for seven days only (a film). */
    allowTemporary?: boolean
    /** More actions in the same row, after the download ones: Trailer, Download a season. */
    children?: ReactNode
}

/**
 * Download button of a title not in the library. Once asked, the button turns
 * into a tag of the same shape that tells where the download stands, with a
 * thin progress bar, next to a small Cancel. When the request becomes
 * available, the catalog is read again and the sheet shows what plays it.
 */
const RequestActions: FC<RequestActionsProps> = ({ requestInput, request, canRequest, lastSyncAt, downloadLabel, allowTemporary, children }) => {
    const t = useTranslation();
    const { containerRef, onFocus, onBlur } = useFocusFollowsButtons();
    const createRequest = useCreateRequest();
    const changeRequest = useChangeRequest();

    const requests = useMemo(() => {
        if (Array.isArray(request)) return request;
        return request ? [ request ] : [];
    }, [ request ]);
    const inputs = useMemo(() => (Array.isArray(requestInput) ? requestInput : [ requestInput ]), [ requestInput ]);
    const tag = summarizeRequests(requests, t);
    const live = requests.filter(item => !isOver(item) && item.State !== RequestState.Available);
    // A temporary film that already left the library no longer counts: it can be asked again
    const isAvailable = requests.some(item => item.State === RequestState.Available && !isOver(item)) && !live.length;

    // Imported: the catalog is read again, finds the library item and the sheet opens its page
    useEffect(() => {
        if (isAvailable) {
            void queryClient.invalidateQueries({ queryKey: [ 'Pufferfin', 'Catalog' ] });
        }
    }, [ isAvailable ]);

    const { isPending: isCreating, mutateAsync: create } = createRequest;
    const download = useCallback((temporary: boolean) => {
        // Not disabled while sending: a disabled button would drop the focus
        if (isCreating) return;
        void (async () => {
            for (const input of inputs) {
                await create(temporary ? { ...input, Temporary: true } : input).catch(() => undefined);
            }
        })();
    }, [ create, inputs, isCreating ]);
    const onDownload = useCallback(() => download(false), [ download ]);
    const onDownloadTemporary = useCallback(() => download(true), [ download ]);

    const { isPending: isChanging, mutate: change } = changeRequest;
    const onCancel = useCallback(() => {
        if (isChanging) return;
        live.filter(isRequestCancellable).forEach(item => {
            change({ requestId: item.Id, change: 'Cancel' });
        });
    }, [ change, isChanging, live ]);
    const onRetry = useCallback(() => {
        if (isChanging) return;
        live.filter(item => item.State === RequestState.Failed).forEach(item => {
            change({ requestId: item.Id, change: 'Retry' });
        });
    }, [ change, isChanging, live ]);

    const isFailed = tag?.state === RequestState.Failed;
    const showDownload = canRequest && !tag && !isAvailable;
    const createStatus = isAxiosError(createRequest.error) ? createRequest.error.response?.status : undefined;

    // Under the status: what went wrong, if anything; the time left is in the status itself
    const single = live.length === 1 ? live[0] : undefined;
    const problem = single ? getRequestProblemLabel(single) : undefined;
    const detail = problem ? t(problem) : undefined;

    return (
        <div ref={containerRef} className='pf-request' onFocus={onFocus} onBlur={onBlur}>
            <div className='pf-button-row'>
                {showDownload && allowTemporary && (
                    <DownloadSplitButton
                        label={downloadLabel ?? t('ActionDownload')}
                        onDownload={onDownload}
                        onDownloadTemporary={onDownloadTemporary}
                    />
                )}
                {showDownload && !allowTemporary && (
                    <RoundButton
                        variant='primary'
                        icon={<Download />}
                        label={downloadLabel ?? t('ActionDownload')}
                        onClick={onDownload}
                    />
                )}
                {tag && <DownloadTag tag={tag} lastSyncAt={lastSyncAt} />}
                {isFailed && (
                    <RoundButton icon={<Refresh />} ariaLabel={t('ActionRetry')} onClick={onRetry} />
                )}
                {tag && live.some(isRequestCancellable) && (
                    <RoundButton icon={<Close />} ariaLabel={t('ActionCancelRequest')} onClick={onCancel} />
                )}
                {children}
            </div>
            {detail && <p className='pf-request__detail'>{detail}</p>}
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
