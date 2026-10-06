import type { Api } from '@jellyfin/sdk';
import { useQuery } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';

import { getPufferfin } from 'apps/pufferfin/api/client';
import type { PufferfinConfiguration } from 'apps/pufferfin/api/types';
import { useApi } from 'hooks/useApi';

export const QUERY_KEY = 'PufferfinConfiguration';

const fetchConfiguration = (api: Api, options?: AxiosRequestConfig) => (
    getPufferfin<PufferfinConfiguration>(api, '/Pufferfin/Configuration', options)
);

/** The Pufferfin configuration. It never contains a secret value: secrets are reported as set or empty. */
export const useConfiguration = () => {
    const { api } = useApi();

    return useQuery({
        queryKey: [ QUERY_KEY ],
        queryFn: ({ signal }) => fetchConfiguration(api!, { signal }),
        enabled: !!api
    });
};
