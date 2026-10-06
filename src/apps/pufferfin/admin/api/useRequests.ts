import type { Api } from '@jellyfin/sdk';
import type { OutboundWebSocketMessageType } from '@jellyfin/sdk/lib/websocket';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';
import { useEffect } from 'react';

import { getPufferfin, postPufferfin } from 'apps/pufferfin/api/client';
import type { MediaRequest } from 'apps/pufferfin/api/types';
import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';

import { applyRequestUpdate } from '../utils/requests';

export const QUERY_KEY = 'PufferfinRequests';

const REQUESTS_PATH = '/Pufferfin/Requests';

/** The WebSocket message the server sends when a request changes. It is not in the generated SDK. */
const REQUEST_UPDATED_MESSAGE = 'PufferfinRequestUpdated' as OutboundWebSocketMessageType;

// The WebSocket reconnects by itself but drops the messages sent meanwhile: the list is also fetched again
// on a timer, so that a missed message never leaves a stale state on screen.
const REFETCH_INTERVAL_MS = 30_000;

const fetchRequests = (api: Api, activeOnly: boolean, options?: AxiosRequestConfig) => (
    getPufferfin<MediaRequest[]>(api, REQUESTS_PATH, { ...options, params: { all: true, activeOnly } })
);

/**
 * Every request of every user, in queue order. Administrators only.
 * Kept live by the `PufferfinRequestUpdated` WebSocket message.
 */
export const useRequests = (activeOnly: boolean) => {
    const { api } = useApi();
    const queryKey = [ QUERY_KEY, activeOnly ];

    useEffect(() => {
        return api?.subscribe([ REQUEST_UPDATED_MESSAGE ], message => {
            const update = (message as { Data?: MediaRequest }).Data;
            if (!update) return;

            const current = queryClient.getQueryData<MediaRequest[]>([ QUERY_KEY, activeOnly ]);
            const next = current && applyRequestUpdate(current, update);
            if (next) {
                queryClient.setQueryData([ QUERY_KEY, activeOnly ], next);
            } else {
                void queryClient.invalidateQueries({ queryKey: [ QUERY_KEY ] });
            }
        });
    }, [ activeOnly, api ]);

    return useQuery({
        queryKey,
        queryFn: ({ signal }) => fetchRequests(api!, activeOnly, { signal }),
        enabled: !!api,
        refetchInterval: REFETCH_INTERVAL_MS
    });
};

export enum RequestAction {
    Approve = 'Approve',
    Reject = 'Reject',
    Cancel = 'Cancel',
    Retry = 'Retry'
}

export interface RequestActionParams {
    requestId: string;
    action: RequestAction;
}

/** Approves, refuses, cancels or retries a request. The server checks that the change applies. */
export const useRequestAction = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: ({ requestId, action }: RequestActionParams) => (
            postPufferfin<MediaRequest>(api!, `${REQUESTS_PATH}/${encodeURIComponent(requestId)}/${action}`)
        ),
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: [ QUERY_KEY ] });
        }
    });
};

export interface MoveRequestParams {
    requestId: string;
    /** The zero based place among the requests waiting for approval or for a slot. */
    index: number;
}

/** Moves a waiting request to a new place in the queue. */
export const useMoveRequest = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: ({ requestId, index }: MoveRequestParams) => (
            postPufferfin<void>(api!, `${REQUESTS_PATH}/${encodeURIComponent(requestId)}/Position`, { Index: index })
        ),
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: [ QUERY_KEY ] });
        }
    });
};
