import { useQuery } from '@tanstack/react-query';

import { getPufferfin } from 'apps/pufferfin/api/client';
import { useApi } from 'hooks/useApi';

/** A management page of the *arr stack, configured on the server by its environment. */
export interface StackLink {
    Name: string
    Url: string
}

const STACK_LINKS_PATH = '/Pufferfin/Stack/Links';

/** The management pages of the stack, asked only for an administrator: the server refuses anyone else. */
export const useStackLinks = () => {
    const { api, user } = useApi();
    const isAdministrator = !!user?.Policy?.IsAdministrator;

    return useQuery({
        queryKey: [ 'PufferfinStackLinks' ],
        queryFn: ({ signal }) => getPufferfin<StackLink[]>(api!, STACK_LINKS_PATH, { signal }),
        enabled: !!api && isAdministrator,
        staleTime: Infinity
    });
};
