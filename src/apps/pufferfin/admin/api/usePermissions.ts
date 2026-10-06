import type { Api } from '@jellyfin/sdk';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';

import { getPufferfin, postPufferfin } from 'apps/pufferfin/api/client';
import type { RequestPermissions } from 'apps/pufferfin/api/types';
import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';

export const QUERY_KEY = 'PufferfinRequestPermissions';

const getPermissionsPath = (userId: string) => `/Pufferfin/Requests/Permissions/${encodeURIComponent(userId)}`;

const fetchPermissions = (api: Api, userId: string, options?: AxiosRequestConfig) => (
    getPufferfin<RequestPermissions>(api, getPermissionsPath(userId), options)
);

/** What a user may request and delete. Administrators only. */
export const usePermissions = (userId: string | undefined) => {
    const { api } = useApi();

    return useQuery({
        queryKey: [ QUERY_KEY, userId ],
        queryFn: ({ signal }) => fetchPermissions(api!, userId!, { signal }),
        enabled: !!api && !!userId
    });
};

/** The fields an administrator can change. The others are computed by the server. */
export type PermissionsUpdate = Pick<RequestPermissions, 'CanRequest' | 'RequiresApproval' | 'WeeklyQuota' | 'CanDelete'>;

export const useUpdatePermissions = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: ({ userId, permissions }: { userId: string, permissions: PermissionsUpdate }) => (
            postPufferfin<RequestPermissions>(api!, getPermissionsPath(userId), permissions)
        ),
        onSuccess: (permissions, { userId }) => {
            queryClient.setQueryData([ QUERY_KEY, userId ], permissions);
        }
    });
};
