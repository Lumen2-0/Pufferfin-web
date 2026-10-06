import type { Api } from '@jellyfin/sdk';
import { useQuery } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';

import { postPufferfin } from 'apps/pufferfin/api/client';
import type { ConnectionTestResult, PufferfinService } from 'apps/pufferfin/api/types';
import { useApi } from 'hooks/useApi';

export const QUERY_KEY = 'PufferfinConnectionTest';

const testConnection = (api: Api, service: PufferfinService, options?: AxiosRequestConfig) => (
    postPufferfin<ConnectionTestResult>(api, `/Pufferfin/Configuration/Services/${service}/Test`, undefined, options)
);

/**
 * Tests the connection to an enabled service with its saved settings. The server bounds the test with a timeout.
 * Call `refetch` to test again.
 */
export const useConnectionTest = (service: PufferfinService, isEnabled: boolean) => {
    const { api } = useApi();

    return useQuery({
        queryKey: [ QUERY_KEY, service ],
        queryFn: ({ signal }) => testConnection(api!, service, { signal }),
        enabled: !!api && isEnabled,
        retry: false,
        refetchOnWindowFocus: false
    });
};
