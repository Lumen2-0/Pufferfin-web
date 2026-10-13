import { useMutation, useQuery } from '@tanstack/react-query';

import { deletePufferfin, getPufferfin, postPufferfin } from 'apps/pufferfin/api/client';
import type { DeletionOutcome } from 'apps/pufferfin/api/types';
import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';

import type { ContentInventory, ScheduledDeletion } from './types';

export const QUERY_KEY = 'PufferfinContent';

const CONTENT_PATH = '/Pufferfin/Content';
const getTitlePath = (itemId: string) => `${CONTENT_PATH}/${encodeURIComponent(itemId)}`;

const refresh = () => queryClient.invalidateQueries({ queryKey: [ QUERY_KEY ] });

/** Every whole title on disk with its torrents. Administrators only: the server refuses anyone else. */
export const useContentInventory = (isEnabled: boolean) => {
    const { api } = useApi();
    return useQuery({
        queryKey: [ QUERY_KEY ],
        queryFn: ({ signal }) => getPufferfin<ContentInventory>(api!, CONTENT_PATH, { signal }),
        enabled: !!api && isEnabled,
        // Ratios and ages move: read again each time the window opens
        staleTime: 0,
        refetchOnWindowFocus: false
    });
};

/** Deletes a title now, safely: a private torrent before its minimum keeps seeding, then goes. */
export const useDeleteContent = () => {
    const { api } = useApi();
    return useMutation({
        mutationFn: (itemId: string) => deletePufferfin<DeletionOutcome>(api!, getTitlePath(itemId)),
        onSettled: refresh
    });
};

/** Schedules the deletion of a title seven days from now. */
export const useScheduleDeletion = () => {
    const { api } = useApi();
    return useMutation({
        mutationFn: (itemId: string) => postPufferfin<ScheduledDeletion>(api!, `${getTitlePath(itemId)}/Schedule`),
        onSettled: refresh
    });
};

/** Cancels the scheduled deletion of a title. */
export const useCancelDeletion = () => {
    const { api } = useApi();
    return useMutation({
        mutationFn: (itemId: string) => deletePufferfin<undefined>(api!, `${getTitlePath(itemId)}/Schedule`),
        onSettled: refresh
    });
};
