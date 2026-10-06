import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useInfiniteQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { getNextPageStart, LIBRARY_PAGE_SIZE, type LibraryKind } from '../utils/library';

const ITEM_TYPES: Record<LibraryKind, BaseItemKind> = {
    movies: BaseItemKind.Movie,
    shows: BaseItemKind.Series
};

/**
 * Movies or series of the local library only, by name, a page at a time.
 * Nothing from the catalog comes here: every title is on disk and playable.
 */
export const useLibraryItems = (kind: LibraryKind) => {
    const { api, user } = useApi();
    return useInfiniteQuery({
        queryKey: [ 'Pufferfin', 'Library', kind, user?.Id ],
        queryFn: async ({ pageParam, signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user!.Id!,
                recursive: true,
                includeItemTypes: [ ITEM_TYPES[kind] ],
                sortBy: [ ItemSortBy.SortName ],
                sortOrder: [ SortOrder.Ascending ],
                fields: [ ItemFields.PrimaryImageAspectRatio ],
                enableImageTypes: [ ImageType.Primary ],
                imageTypeLimit: 1,
                startIndex: pageParam,
                limit: LIBRARY_PAGE_SIZE,
                enableTotalRecordCount: true
            }, { signal });
            return {
                items: (response.data.Items ?? []) as ItemDto[],
                startIndex: pageParam,
                totalCount: response.data.TotalRecordCount ?? 0
            };
        },
        initialPageParam: 0,
        getNextPageParam: getNextPageStart,
        enabled: !!api && !!user?.Id
    });
};
