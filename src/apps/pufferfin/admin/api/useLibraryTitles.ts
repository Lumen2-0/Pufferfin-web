import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

export const QUERY_KEY = 'PufferfinLibraryTitles';

/** The kinds of title the storage screen can delete as a whole. */
export const DELETABLE_KINDS = [ BaseItemKind.Movie, BaseItemKind.Series, BaseItemKind.AudioBook ] as const;

export type DeletableKind = typeof DELETABLE_KINDS[number];

export interface LibraryTitlesQuery {
    searchTerm: string;
    kinds: DeletableKind[];
    sortBy: ItemSortBy;
    descending: boolean;
    startIndex: number;
    limit: number;
}

/** Titles of the library, searched and sorted by the server, a page at a time. */
export const useLibraryTitles = (query: LibraryTitlesQuery) => {
    const { api, user } = useApi();

    return useQuery({
        queryKey: [ QUERY_KEY, user?.Id, query ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user!.Id!,
                recursive: true,
                includeItemTypes: query.kinds.length ? query.kinds : [ ...DELETABLE_KINDS ],
                searchTerm: query.searchTerm.trim() || undefined,
                sortBy: [ query.sortBy, ItemSortBy.SortName ],
                sortOrder: [ query.descending ? SortOrder.Descending : SortOrder.Ascending ],
                startIndex: query.startIndex,
                limit: query.limit,
                enableImages: false,
                enableUserData: false,
                enableTotalRecordCount: true
            }, { signal });

            return {
                items: response.data.Items ?? [],
                totalCount: response.data.TotalRecordCount ?? 0
            };
        },
        enabled: !!api && !!user?.Id,
        placeholderData: keepPreviousData
    });
};
