import { useMutation, useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';

import { getPufferfin, postPufferfin } from '../../../api/client';
import { isRequestActive, isSameId, REQUESTS_RESYNC_MS, upsertRequest } from '../utils/requests';
import type { CreateMediaRequest, MediaRequest, RequestPermissions } from './types';

export const QUERY_KEY = 'PufferfinRequests';
const PERMISSIONS_QUERY_KEY = 'PufferfinRequestPermissions';
const ALL_SCOPE = 'All';

export const getRequestsQueryKey = (userId: string | undefined) => [ QUERY_KEY, userId ];
const getAllRequestsQueryKey = () => [ QUERY_KEY, ALL_SCOPE ];

/**
 * Puts a request returned or pushed by the server into the cached lists: the
 * list of the user when it is theirs, and the list of every request when an
 * administrator has it open.
 */
export const storeRequest = (userId: string | undefined, request: MediaRequest, isOwn = true) => {
    if (isOwn) {
        queryClient.setQueryData<MediaRequest[]>(getRequestsQueryKey(userId), requests => upsertRequest(requests, request));
    }
    // Never creates the list of every request: only an administrator screen reads it
    if (queryClient.getQueryData(getAllRequestsQueryKey())) {
        queryClient.setQueryData<MediaRequest[]>(getAllRequestsQueryKey(), requests => upsertRequest(requests, request));
    }
};

// While one is on its way the list is also read again on a short interval,
// so a missed message or a reconnection never leaves an old state on screen for long
const resyncWhileActive = (data: MediaRequest[] | undefined) => (data?.some(isRequestActive) ? REQUESTS_RESYNC_MS : false);

/** The requests of the current user, in queue order. WebSocket messages keep the list current. */
export const useMyRequests = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: getRequestsQueryKey(user?.Id),
        queryFn: ({ signal }) => getPufferfin<MediaRequest[]>(api!, '/Pufferfin/Requests', { signal }),
        enabled: !!api && !!user?.Id,
        refetchInterval: query => resyncWhileActive(query.state.data)
    });
};

/** Every request of every user, in queue order. Administrators only: the server answers others with their own. */
export const useAllRequests = (isEnabled: boolean) => {
    const { api } = useApi();
    return useQuery({
        queryKey: getAllRequestsQueryKey(),
        queryFn: ({ signal }) => getPufferfin<MediaRequest[]>(api!, '/Pufferfin/Requests', { params: { all: true }, signal }),
        enabled: !!api && isEnabled,
        refetchInterval: query => resyncWhileActive(query.state.data)
    });
};

/** What the current user may request. The server checks it again on every request. */
export const useRequestPermissions = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ PERMISSIONS_QUERY_KEY, user?.Id ],
        queryFn: ({ signal }) => getPufferfin<RequestPermissions>(api!, '/Pufferfin/Requests/Permissions/Me', { signal }),
        enabled: !!api && !!user?.Id
    });
};

export const useCreateRequest = () => {
    const { api, user } = useApi();
    return useMutation({
        mutationFn: (request: CreateMediaRequest) => postPufferfin<MediaRequest>(api!, '/Pufferfin/Requests', request),
        onSuccess: request => {
            storeRequest(user?.Id, request);
            // The weekly quota moved
            void queryClient.invalidateQueries({ queryKey: [ PERMISSIONS_QUERY_KEY ] });
        }
    });
};

/** Cancel and Try Again for the owner; Approve and Reject for administrators, checked by the server. */
export type RequestChange = 'Cancel' | 'Retry' | 'Approve' | 'Reject';

/** Changes a request. Cancelling deletes nothing from Radarr, Sonarr or qBittorrent. */
export const useChangeRequest = () => {
    const { api, user } = useApi();
    return useMutation({
        mutationFn: ({ requestId, change }: { requestId: string, change: RequestChange }) => (
            postPufferfin<MediaRequest>(api!, `/Pufferfin/Requests/${requestId}/${change}`)
        ),
        onSuccess: changed => storeRequest(user?.Id, changed, isSameId(changed.UserId, user?.Id))
    });
};

/**
 * Moves a waiting request to a new place in the queue. Administrators only.
 * The lists are read again afterwards: the order is not part of the pushed messages.
 */
export const useMoveRequest = () => {
    const { api } = useApi();
    return useMutation({
        mutationFn: ({ requestId, index }: { requestId: string, index: number }) => (
            postPufferfin<void>(api!, `/Pufferfin/Requests/${requestId}/Position`, { Index: index })
        ),
        onSettled: () => queryClient.invalidateQueries({ queryKey: [ QUERY_KEY ] })
    });
};
