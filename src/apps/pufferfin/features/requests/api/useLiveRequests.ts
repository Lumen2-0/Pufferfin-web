import type { OutboundWebSocketMessageType } from '@jellyfin/sdk/lib/websocket';
import { useEffect } from 'react';

import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';

import { REQUEST_UPDATED_MESSAGE, type MediaRequest, RequestState } from './types';
import { storeRequest } from './useRequests';

// The Pufferfin message is not in the SDK list of message types; the SDK dispatches any type by name
const REQUEST_UPDATED = REQUEST_UPDATED_MESSAGE as OutboundWebSocketMessageType;

// The server writes ids without dashes, the SDK user may carry them
const normalizeId = (id: string) => id.replace(/-/g, '').toLowerCase();

/**
 * Listens for request changes pushed by the server, progress included, for as
 * long as the Pufferfin interface is open. The SDK reconnects the socket on
 * its own; what is missed meanwhile is caught by the periodic read of the list.
 */
export const useLiveRequests = () => {
    const { api, user } = useApi();
    const userId = user?.Id;

    useEffect(() => {
        if (!api || !userId) return;
        return api.subscribe([ REQUEST_UPDATED ], message => {
            const request = (message as { Data?: MediaRequest }).Data;
            // Administrators also receive the requests of other users: the screens only show their own
            if (!request || normalizeId(request.UserId) !== normalizeId(userId)) return;

            storeRequest(userId, request);

            if (request.State === RequestState.Available) {
                // The title is in the library now: catalog entries switch from Download to Play
                void queryClient.invalidateQueries({ queryKey: [ 'Pufferfin', 'Catalog' ] });
            }
        });
    }, [ api, userId ]);
};
