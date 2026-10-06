import type { OutboundWebSocketMessageType } from '@jellyfin/sdk/lib/websocket';
import { useEffect } from 'react';

import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';

import { REQUEST_UPDATED_MESSAGE, type MediaRequest, RequestState } from './types';
import { isSameId } from '../utils/requests';
import { storeRequest } from './useRequests';

// The Pufferfin message is not in the SDK list of message types; the SDK dispatches any type by name
const REQUEST_UPDATED = REQUEST_UPDATED_MESSAGE as OutboundWebSocketMessageType;

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
            if (!request) return;

            // Administrators also receive the requests of other users: those only go to the list of every request
            storeRequest(userId, request, isSameId(request.UserId, userId));

            if (request.State === RequestState.Available) {
                // The title is in the library now: catalog entries switch from Download to Play,
                // and a series page reads its library seasons and episodes again
                void queryClient.invalidateQueries({ queryKey: [ 'Pufferfin', 'Catalog' ] });
                void queryClient.invalidateQueries({ queryKey: [ 'Pufferfin', 'Details' ] });
            }
        });
    }, [ api, userId ]);
};
