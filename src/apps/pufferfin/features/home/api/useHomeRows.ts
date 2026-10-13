import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { getUserDataApi } from '@jellyfin/sdk/lib/utils/api/user-data-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

/** Rows built from the local library only. Catalog rows (TMDB, Audible) come with the server catalog. */
const ROW_LIMIT = 20;

const FIELDS = [ ItemFields.Overview, ItemFields.PrimaryImageAspectRatio ];
const IMAGE_TYPES = [ ImageType.Primary, ImageType.Thumb, ImageType.Backdrop ];

/** Videos to resume, optionally of some types only (films, episodes). */
export const useResumeItems = (itemTypes?: BaseItemKind[]) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Home', 'Resume', itemTypes, user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getResumeItems({
                userId: user!.Id!,
                limit: ROW_LIMIT,
                mediaTypes: [ MediaType.Video ],
                includeItemTypes: itemTypes,
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

/**
 * Takes a title out of what to resume: its position goes back to the start,
 * as if it had never been begun. It stays in the library, and unwatched.
 */
export const useDismissResume = () => {
    const { api, user } = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (itemId: string) => {
            await getUserDataApi(api!).updateItemUserData({
                itemId,
                userId: user!.Id!,
                updateUserItemDataDto: { PlaybackPositionTicks: 0 }
            });
        },
        onSuccess: () => queryClient.invalidateQueries({
            predicate: query => query.queryKey[0] === 'Pufferfin' && query.queryKey.some(part => part === 'Resume' || part === 'ResumeAudio')
        })
    });
};

/** The newest titles of the library, optionally of some types only; episodes come grouped by series. */
export const useLatestItems = (itemTypes?: BaseItemKind[]) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Home', 'Latest', itemTypes, user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getLatestMedia({
                userId: user!.Id!,
                includeItemTypes: itemTypes,
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

/** Audiobooks of the library: the ones listened to last first, then the newest. */
export const useAudiobookItems = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Home', 'Audiobooks', user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user!.Id!,
                includeItemTypes: [ BaseItemKind.AudioBook ],
                recursive: true,
                sortBy: [ ItemSortBy.DatePlayed, ItemSortBy.DateCreated ],
                sortOrder: [ SortOrder.Descending, SortOrder.Descending ],
                limit: ROW_LIMIT,
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
