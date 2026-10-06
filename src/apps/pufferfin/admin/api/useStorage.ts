import type { Api } from '@jellyfin/sdk';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';

import { getPufferfin, postPufferfin } from 'apps/pufferfin/api/client';
import type { SeedCycleResult, StorageReport } from 'apps/pufferfin/api/types';
import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';

export const QUERY_KEY = 'PufferfinStorage';

const STORAGE_PATH = '/Pufferfin/Storage';

const fetchStorage = (api: Api, refreshHardlinks: boolean, options?: AxiosRequestConfig) => (
    getPufferfin<StorageReport>(api, STORAGE_PATH, { ...options, params: { refreshHardlinks } })
);

/** The real disk usage and the seeding state of each torrent. Administrators only. */
export const useStorage = () => {
    const { api } = useApi();

    return useQuery({
        queryKey: [ QUERY_KEY ],
        queryFn: ({ signal }) => fetchStorage(api!, false, { signal }),
        enabled: !!api
    });
};

/** Checks the hard links again rather than use the result of the last hour. */
export const useRefreshStorage = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: () => fetchStorage(api!, true),
        onSuccess: (report) => {
            queryClient.setQueryData([ QUERY_KEY ], report);
        }
    });
};

/** Runs the seeding policy now. Safe at any time: no torrent is purged before its minimum seeding time. */
export const useRunSeedPolicy = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: () => postPufferfin<SeedCycleResult>(api!, `${STORAGE_PATH}/SeedPolicy/Run`),
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: [ QUERY_KEY ] });
        }
    });
};
