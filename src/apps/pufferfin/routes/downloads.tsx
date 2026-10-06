import ErrorOutline from '@mui/icons-material/ErrorOutline';
import { getUserApi } from '@jellyfin/sdk/lib/utils/api/user-api';
import { useQuery } from '@tanstack/react-query';
import React, { type FC, type FocusEvent, useCallback, useLayoutEffect, useMemo, useRef } from 'react';

import { useApi } from 'hooks/useApi';

import DownloadRow, { type DownloadRowActions, REQUEST_ROW_ATTRIBUTE } from '../features/requests/components/DownloadRow';
import type { MediaRequest } from '../features/requests/api/types';
import { useAllRequests, useChangeRequest, useMoveRequest, useMyRequests } from '../features/requests/api/useRequests';
import { getMoveIndex, isSameId, type MoveDirection, normalizeId, splitRequests } from '../features/requests/utils/requests';
import { useTranslation } from '../i18n/useTranslation';
import { focusElement, focusFirst, getFocusables } from '../navigation/focus';
import { useInitialFocus } from '../navigation/useInitialFocus';

/** How many finished requests the panel keeps on screen. */
const FINISHED_LIMIT = 20;

/** Names of the users, for an administrator who sees every request. */
const useOwnerNames = (isEnabled: boolean) => {
    const { api } = useApi();
    const { data } = useQuery({
        queryKey: [ 'PufferfinRequestOwners' ],
        queryFn: async ({ signal }) => (await getUserApi(api!).getUsers(undefined, { signal })).data,
        enabled: !!api && isEnabled
    });
    return useMemo(() => data ?? [], [ data ]);
};

/**
 * Keeps the focus on the same request when its row moves or its buttons
 * change: on the button at the same place, else the closest one left, else
 * the first element of the list. The focus never drops to the page.
 */
const useFocusKeeper = (listRef: React.RefObject<HTMLElement>) => {
    const last = useRef<{ requestId: string, index: number }>();

    const onFocus = useCallback((event: FocusEvent) => {
        const row = (event.target as HTMLElement).closest(`[${REQUEST_ROW_ATTRIBUTE}]`);
        const requestId = row?.getAttribute(REQUEST_ROW_ATTRIBUTE);
        if (!row || !requestId) return;
        last.current = { requestId, index: getFocusables(row).indexOf(event.target as HTMLElement) };
    }, []);
    const onBlur = useCallback((event: FocusEvent) => {
        // A null target means the focused element went away: keep the record to restore the focus
        if (event.relatedTarget && !listRef.current?.contains(event.relatedTarget as Node)) last.current = undefined;
    }, [ listRef ]);

    useLayoutEffect(() => {
        const list = listRef.current;
        const record = last.current;
        const active = document.activeElement;
        if (!list || !record || (active && active !== document.body)) return;
        const row = list.querySelector(`[${REQUEST_ROW_ATTRIBUTE}="${record.requestId}"]`);
        const focusables = row ? getFocusables(row) : [];
        const target = focusables[Math.min(Math.max(record.index, 0), focusables.length - 1)];
        if (target) {
            focusElement(target);
        } else {
            focusFirst(list);
        }
    });

    return { onFocus, onBlur };
};

const RequestList: FC<{
    title: string
    titleId: string
    requests: MediaRequest[]
    allRequests: MediaRequest[]
    lastSyncAt: number
    isAdministrator: boolean
    userId?: string
    ownerNames: Map<string, string>
    actions: DownloadRowActions
}> = ({ title, titleId, requests, allRequests, lastSyncAt, isAdministrator, userId, ownerNames, actions }) => (
    <section className='pf-downloads__section' aria-labelledby={titleId}>
        <h2 id={titleId} className='pf-row__title'>{title}</h2>
        <ul className='pf-downloads__list'>
            {requests.map(item => (
                <DownloadRow
                    key={item.Id}
                    request={item}
                    lastSyncAt={lastSyncAt}
                    ownerName={isAdministrator && !isSameId(item.UserId, userId) ?
                        ownerNames.get(normalizeId(item.UserId)) :
                        undefined}
                    isAdministrator={isAdministrator}
                    canMoveUp={isAdministrator && getMoveIndex(allRequests, item.Id, 'up') !== undefined}
                    canMoveDown={isAdministrator && getMoveIndex(allRequests, item.Id, 'down') !== undefined}
                    actions={actions}
                />
            ))}
        </ul>
    </section>
);

/**
 * The downloads panel: every request on its way, in queue order, with its
 * progress, its errors and what can be done about it, then the latest
 * finished ones. Administrators see the requests of every user and can order
 * the queue, approve and refuse.
 */
export const Component = () => {
    const t = useTranslation();
    const { user } = useApi();
    const pageRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const isAdministrator = !!user?.Policy?.IsAdministrator;

    const own = useMyRequests();
    const all = useAllRequests(isAdministrator);
    const query = isAdministrator ? all : own;
    const { current, finished } = useMemo(() => splitRequests(query.data), [ query.data ]);
    const users = useOwnerNames(isAdministrator);
    const ownerNames = useMemo(
        () => new Map(users.map(owner => [ normalizeId(owner.Id ?? ''), owner.Name ?? '' ])),
        [ users ]
    );

    const { mutate: change, isPending: isChanging, isError: isChangeError } = useChangeRequest();
    const { mutate: move, isPending: isMoving, isError: isMoveError } = useMoveRequest();
    const allRequests = query.data;

    const actions = useMemo<DownloadRowActions>(() => {
        // Buttons are not disabled while a change is sent: a disabled button would drop the focus
        const onChange = (requestId: string, kind: 'Cancel' | 'Retry' | 'Approve' | 'Reject') => {
            if (!isChanging) change({ requestId, change: kind });
        };
        const onMove = (requestId: string, direction: MoveDirection) => {
            const index = getMoveIndex(allRequests ?? [], requestId, direction);
            if (!isMoving && index !== undefined) move({ requestId, index });
        };
        return {
            onCancel: requestId => onChange(requestId, 'Cancel'),
            onRetry: requestId => onChange(requestId, 'Retry'),
            onApprove: requestId => onChange(requestId, 'Approve'),
            onReject: requestId => onChange(requestId, 'Reject'),
            onMoveUp: requestId => onMove(requestId, 'up'),
            onMoveDown: requestId => onMove(requestId, 'down')
        };
    }, [ allRequests, change, isChanging, isMoving, move ]);

    const { onFocus, onBlur } = useFocusKeeper(listRef);
    useInitialFocus(pageRef, [ query.isPending ], !query.isPending);

    let content: React.ReactNode;
    if (query.isPending) {
        content = <p className='pf-library__note' aria-busy='true'>{t('Loading')}</p>;
    } else if (query.isError) {
        // Failure is told with an icon and words, never with color alone
        content = (
            <p className='pf-row__error' role='status'>
                <ErrorOutline aria-hidden='true' />
                {t('DownloadsLoadError')}
            </p>
        );
    } else if (!current.length && !finished.length) {
        content = <p className='pf-library__note'>{t('DownloadsEmpty')}</p>;
    } else {
        const listProps = {
            allRequests: allRequests ?? [],
            lastSyncAt: query.dataUpdatedAt,
            isAdministrator,
            userId: user?.Id,
            ownerNames,
            actions
        };
        content = (
            <>
                {current.length > 0 ? (
                    <RequestList title={t('DownloadsCurrent')} titleId='pf-downloads-current' requests={current} {...listProps} />
                ) : (
                    <p className='pf-library__note'>{t('DownloadsNothingCurrent')}</p>
                )}
                {finished.length > 0 && (
                    <RequestList
                        title={t('DownloadsFinished')}
                        titleId='pf-downloads-finished'
                        requests={finished.slice(0, FINISHED_LIMIT)}
                        {...listProps}
                    />
                )}
            </>
        );
    }

    return (
        <div ref={pageRef} className='pf-library pf-downloads'>
            <h1 className='pf-library__title'>{t('NavDownloads')}</h1>
            {(isChangeError || isMoveError) && (
                <p className='pf-row__error' role='alert'>
                    <ErrorOutline aria-hidden='true' />
                    {t('RequestErrorChange')}
                </p>
            )}
            <div ref={listRef} onFocus={onFocus} onBlur={onBlur} aria-busy={query.isPending}>
                {content}
            </div>
        </div>
    );
};

Component.displayName = 'PufferfinDownloadsPage';
