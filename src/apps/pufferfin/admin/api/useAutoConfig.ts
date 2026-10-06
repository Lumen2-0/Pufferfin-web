import type { Api } from '@jellyfin/sdk';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';

import { getPufferfin, postPufferfin } from 'apps/pufferfin/api/client';
import type { AutoConfigRun } from 'apps/pufferfin/api/types';
import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';

export const QUERY_KEY = 'PufferfinAutoConfig';

const AUTO_CONFIG_PATH = '/Pufferfin/Configuration/AutoConfig';

// The server answers 204 with an empty body when no run has completed yet.
const fetchLastRun = async (api: Api, options?: AxiosRequestConfig) => (
    (await getPufferfin<AutoConfigRun | ''>(api, AUTO_CONFIG_PATH, options)) || null
);

/** The last auto-configuration run, or `null` when none has completed yet. */
export const useAutoConfig = () => {
    const { api } = useApi();

    return useQuery({
        queryKey: [ QUERY_KEY ],
        queryFn: ({ signal }) => fetchLastRun(api!, { signal }),
        enabled: !!api
    });
};

/** Replays the auto-configuration now and waits for the result. */
export const useRunAutoConfig = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: () => postPufferfin<AutoConfigRun>(api!, AUTO_CONFIG_PATH),
        onSuccess: (run) => {
            queryClient.setQueryData([ QUERY_KEY ], run);
        }
    });
};
