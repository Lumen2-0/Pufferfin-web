import { OutboundWebSocketMessageType } from '@jellyfin/sdk/lib/websocket';
import { useEffect } from 'react';

import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';

import { holdsUserData } from './userDataQueries';

/**
 * Reads the lists showing watch progress again when the server says the user
 * data of the user changed: a play stopped, a title marked watched. The page
 * left for the player then shows where the play stopped, its Resume button
 * included, rather than what it read before the play.
 */
export const useLiveUserData = () => {
    const { api, user } = useApi();
    const userId = user?.Id;

    useEffect(() => {
        if (!api || !userId) return;
        return api.subscribe([ OutboundWebSocketMessageType.UserDataChanged ], () => {
            void queryClient.invalidateQueries({ predicate: query => holdsUserData(query.queryKey, userId) });
        });
    }, [ api, userId ]);
};
