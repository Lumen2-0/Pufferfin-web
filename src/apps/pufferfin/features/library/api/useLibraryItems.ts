import type { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { getNextPageStart, LIBRARY_PAGE_SIZE } from '../utils/library';

const ROW_LIMIT = 20;
const FIELDS = [ ItemFields.Overview, ItemFields.PrimaryImageAspectRatio ];
const IMAGE_TYPES = [ ImageType.Primary, ImageType.Thumb, ImageType.Backdrop ];

/**
 * The titles of one library, by name, a page at a time. Nothing from the
 * catalog comes here: every title is on disk and playable.
 */
export const useLibraryItems = (parentId: string | undefined, itemTypes: BaseItemKind[] | null) => {
    const { api, user } = useApi();
    return useInfiniteQuery({
        queryKey: [ 'Pufferfin', 'Library', parentId, itemTypes, user?.Id ],
        queryFn: async ({ pageParam, signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user!.Id!,
                parentId,
                recursive: true,
                includeItemTypes: itemTypes ?? undefined,
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
        enabled: !!api && !!user?.Id && !!parentId && itemTypes !== null
    });
};

/** The newest titles of one library, as the upstream home shows them; episodes come grouped by series. */
export const useLatestInLibrary = (parentId: string) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Library', 'Latest', parentId, user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getLatestMedia({
                userId: user!.Id!,
                parentId,
                limit: ROW_LIMIT,
                fields: FIELDS,
                enableImageTypes: IMAGE_TYPES,
                imageTypeLimit: 1
            }, { signal });
            return response.data as ItemDto[];
        },
        enabled: !!api && !!user?.Id
    });
};

/** Music and audiobooks to pick up where the user stopped. */
export const useResumeAudioItems = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Library', 'ResumeAudio', user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getResumeItems({
                userId: user!.Id!,
                limit: ROW_LIMIT,
                mediaTypes: [ MediaType.Audio ],
                fields: FIELDS,
                enableImageTypes: IMAGE_TYPES,
                imageTypeLimit: 1,
                enableTotalRecordCount: false
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id
    });
};
