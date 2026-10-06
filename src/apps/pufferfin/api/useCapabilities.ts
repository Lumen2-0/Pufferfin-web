import type { Api } from '@jellyfin/sdk';
import { useQuery } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';

import { useApi } from 'hooks/useApi';

import { getPufferfin } from './client';
import type { PufferfinCapabilities } from './types';

export const QUERY_KEY = 'PufferfinCapabilities';

const fetchCapabilities = (api: Api, options?: AxiosRequestConfig) => (
    getPufferfin<PufferfinCapabilities>(api, '/Pufferfin/Capabilities', options)
);

/**
 * Which Pufferfin services are enabled. Features of a disabled service are hidden.
 * Invalidated after every configuration save, so features appear or disappear without a restart.
 */
export const useCapabilities = () => {
    const { api } = useApi();

    return useQuery({
        queryKey: [ QUERY_KEY ],
        queryFn: ({ signal }) => fetchCapabilities(api!, { signal }),
        enabled: !!api
    });
};
