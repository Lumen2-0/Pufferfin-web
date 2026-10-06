import { useMutation, useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';

import { getPufferfin, postPufferfin } from '../../../api/client';
import { isRequestActive, REQUESTS_RESYNC_MS, upsertRequest } from '../utils/requests';
import type { CreateMediaRequest, MediaRequest, RequestPermissions } from './types';

export const QUERY_KEY = 'PufferfinRequests';
const PERMISSIONS_QUERY_KEY = 'PufferfinRequestPermissions';

export const getRequestsQueryKey = (userId: string | undefined) => [ QUERY_KEY, userId ];

/** Puts a request returned or pushed by the server into the list of the user. */
export const storeRequest = (userId: string | undefined, request: MediaRequest) => {
    queryClient.setQueryData<MediaRequest[]>(getRequestsQueryKey(userId), requests => upsertRequest(requests, request));
};

/**
 * The requests of the current user, in queue order. WebSocket messages keep
 * the list current; while one is on its way the list is also read again on a
 * short interval, so a missed message or a reconnection never leaves an old
 * state on screen for long.
 */
export const useMyRequests = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: getRequestsQueryKey(user?.Id),
        queryFn: ({ signal }) => getPufferfin<MediaRequest[]>(api!, '/Pufferfin/Requests', { signal }),
        enabled: !!api && !!user?.Id,
        refetchInterval: query => (query.state.data?.some(isRequestActive) ? REQUESTS_RESYNC_MS : false)
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

/** Cancels or retries a request. Nothing is deleted from Radarr, Sonarr or qBittorrent. */
export const useChangeRequest = () => {
    const { api, user } = useApi();
    return useMutation({
        mutationFn: ({ requestId, change }: { requestId: string, change: 'Cancel' | 'Retry' }) => (
            postPufferfin<MediaRequest>(api!, `/Pufferfin/Requests/${requestId}/${change}`)
        ),
        onSuccess: request => storeRequest(user?.Id, request)
    });
};
