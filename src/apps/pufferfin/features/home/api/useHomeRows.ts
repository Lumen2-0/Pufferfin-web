import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { getShowApi } from '@jellyfin/sdk/lib/utils/api/show-api';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

/** Rows built from the local library only. Catalog rows (TMDB, Audible) come with the server catalog. */
const ROW_LIMIT = 20;

const FIELDS = [ ItemFields.Overview, ItemFields.PrimaryImageAspectRatio ];
const IMAGE_TYPES = [ ImageType.Primary, ImageType.Thumb, ImageType.Backdrop ];

export const useResumeItems = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Home', 'Resume', user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getResumeItems({
                userId: user!.Id!,
                limit: ROW_LIMIT,
                mediaTypes: [ MediaType.Video ],
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

export const useNextUpItems = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Home', 'NextUp', user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getShowApi(api!).getNextUp({
                userId: user!.Id!,
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

export const useLatestItems = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Home', 'Latest', user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getLatestMedia({
                userId: user!.Id!,
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
