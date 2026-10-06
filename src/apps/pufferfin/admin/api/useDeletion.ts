import type { Api } from '@jellyfin/sdk';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';

import { deletePufferfin, getPufferfin } from 'apps/pufferfin/api/client';
import { type DeletionMode, type DeletionOutcome } from 'apps/pufferfin/api/types';
import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';

import { QUERY_KEY as LIBRARY_TITLES_QUERY_KEY } from './useLibraryTitles';
import { QUERY_KEY as STORAGE_QUERY_KEY } from './useStorage';

export const QUERY_KEY = 'PufferfinDeletionPlan';

const getLibraryPath = (itemId: string) => `/Pufferfin/Library/${encodeURIComponent(itemId)}`;

const fetchDeletionPlan = (api: Api, itemId: string, mode: DeletionMode, options?: AxiosRequestConfig) => (
    getPufferfin<DeletionOutcome>(api, `${getLibraryPath(itemId)}/Deletion`, { ...options, params: { mode } })
);

/** What deleting a title would do, without deleting anything. */
export const useDeletionPlan = (itemId: string | undefined, mode: DeletionMode) => {
    const { api } = useApi();

    return useQuery({
        queryKey: [ QUERY_KEY, itemId, mode ],
        queryFn: ({ signal }) => fetchDeletionPlan(api!, itemId!, mode, { signal }),
        enabled: !!api && !!itemId,
        // A plan depends on seeding times that change: never reuse an old one.
        gcTime: 0,
        staleTime: 0,
        retry: false,
        refetchOnWindowFocus: false
    });
};

export interface DeleteTitleParams {
    itemId: string;
    mode: DeletionMode;
    /** The user confirmed the immediate mode after reading its warning. The server requires it. */
    confirm: boolean;
}

/** Deletes a title. The server checks the rights, and refuses the immediate mode without the confirmation. */
export const useDeleteTitle = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: ({ itemId, mode, confirm }: DeleteTitleParams) => (
            deletePufferfin<DeletionOutcome>(api!, getLibraryPath(itemId), { params: { mode, confirm } })
        ),
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: [ STORAGE_QUERY_KEY ] });
            void queryClient.invalidateQueries({ queryKey: [ LIBRARY_TITLES_QUERY_KEY ] });
        }
    });
};
