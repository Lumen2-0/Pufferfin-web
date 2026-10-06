import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { getShowApi } from '@jellyfin/sdk/lib/utils/api/show-api';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

/**
 * Library data for the detail page. Catalog data (TMDB seasons and episodes
 * missing from the disk, saga, Letterboxd) comes with the server catalog.
 */

const IMAGE_TYPES = [ ImageType.Primary, ImageType.Thumb, ImageType.Backdrop ];

export const useSeasons = (seriesId: string | undefined) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Details', 'Seasons', seriesId, user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getShowApi(api!).getSeasons({
                seriesId: seriesId!,
                userId: user!.Id!,
                enableImages: false
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id && !!seriesId
    });
};

export const useEpisodes = (seriesId: string | undefined, seasonId: string | undefined) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Details', 'Episodes', seriesId, seasonId, user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getShowApi(api!).getEpisodes({
                seriesId: seriesId!,
                seasonId: seasonId!,
                userId: user!.Id!,
                fields: [ ItemFields.Overview ],
                enableImageTypes: IMAGE_TYPES,
                imageTypeLimit: 1
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id && !!seriesId && !!seasonId
    });
};

/** Episode the Play button starts for a series: the next one to watch. */
export const useSeriesNextUp = (seriesId: string | undefined) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Details', 'NextUp', seriesId, user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getShowApi(api!).getNextUp({
                seriesId: seriesId!,
                userId: user!.Id!,
                limit: 1,
                enableTotalRecordCount: false
            }, { signal });
            return (response.data.Items?.[0] ?? null) as ItemDto | null;
        },
        enabled: !!api && !!user?.Id && !!seriesId
    });
};

export const useSimilarItems = (itemId: string | undefined) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Details', 'Similar', itemId, user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getSimilarItems({
                itemId: itemId!,
                userId: user!.Id!,
                limit: 16,
                fields: [ ItemFields.PrimaryImageAspectRatio ]
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id && !!itemId
    });
};
