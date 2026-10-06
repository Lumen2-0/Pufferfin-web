import { useMutation } from '@tanstack/react-query';

import { postPufferfin } from 'apps/pufferfin/api/client';
import type { PufferfinConfiguration, PufferfinConfigurationUpdate } from 'apps/pufferfin/api/types';
import { QUERY_KEY as CAPABILITIES_QUERY_KEY } from 'apps/pufferfin/api/useCapabilities';
import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';

import { QUERY_KEY as AUTO_CONFIG_QUERY_KEY } from './useAutoConfig';
import { QUERY_KEY as CONNECTION_TEST_QUERY_KEY } from './useConnectionTest';
import { QUERY_KEY } from './useConfiguration';

export const useUpdateConfiguration = () => {
    const { api } = useApi();

    return useMutation({
        // The update can carry a new secret: it must not outlive the request in the mutation cache.
        gcTime: 0,
        mutationFn: (update: PufferfinConfigurationUpdate) => (
            postPufferfin<PufferfinConfiguration>(api!, '/Pufferfin/Configuration', update)
        ),
        onSuccess: (configuration) => {
            queryClient.setQueryData([ QUERY_KEY ], configuration);

            // Services may have been enabled or disabled: features appear or disappear without a restart.
            // Refetched even when no screen currently shows them, so the cache is never stale.
            void queryClient.invalidateQueries({ queryKey: [ CAPABILITIES_QUERY_KEY ], refetchType: 'all' });
            void queryClient.invalidateQueries({ queryKey: [ CONNECTION_TEST_QUERY_KEY ] });
            void queryClient.invalidateQueries({ queryKey: [ AUTO_CONFIG_QUERY_KEY ] });
        }
    });
};
