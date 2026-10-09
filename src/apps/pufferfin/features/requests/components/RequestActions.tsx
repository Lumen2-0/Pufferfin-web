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

const SECONDS_PER_MINUTE = 60;

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
    /** More actions in the same row, after the download ones: Trailer, Download a season. */
    children?: ReactNode
}

/**
 * Download button of a title not in the library. Once asked, the button turns
 * into a tag of the same shape that tells where the download stands, with a
 * thin progress bar, next to a small Cancel. When the request becomes
 * available, the catalog is read again and the sheet shows what plays it.
 */
const RequestActions: FC<RequestActionsProps> = ({ requestInput, request, canRequest, lastSyncAt, downloadLabel, children }) => {
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
    const isAvailable = requests.some(item => item.State === RequestState.Available) && !live.length;

    // Imported: the catalog is read again, finds the library item and the sheet opens its page
    useEffect(() => {
        if (isAvailable) {
            void queryClient.invalidateQueries({ queryKey: [ 'Pufferfin', 'Catalog' ] });
        }
    }, [ isAvailable ]);

    const { isPending: isCreating, mutateAsync: create } = createRequest;
    const onDownload = useCallback(() => {
        // Not disabled while sending: a disabled button would drop the focus
        if (isCreating) return;
        void (async () => {
            for (const input of inputs) {
                await create(input).catch(() => undefined);
            }
        })();
    }, [ create, inputs, isCreating ]);

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

    // Under the tag: the time left while downloading, else what went wrong
    const single = live.length === 1 ? live[0] : undefined;
    let detail: string | undefined;
    if (single?.State === RequestState.Downloading && single.EtaSeconds) {
        const minutes = Math.ceil(single.EtaSeconds / SECONDS_PER_MINUTE);
        detail = minutes <= 1 ? t('RequestEtaUnderMinute') : t('RequestEtaMinutes', minutes);
    } else if (single) {
        const problem = getRequestProblemLabel(single);
        detail = problem ? t(problem) : undefined;
    }

    return (
        <div ref={containerRef} className='pf-request' onFocus={onFocus} onBlur={onBlur}>
            <div className='pf-button-row'>
                {showDownload && (
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
