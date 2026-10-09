import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { getLiveTvApi } from '@jellyfin/sdk/lib/utils/api/live-tv-api';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

/** Rows of the Discover types that the home rows do not cover: live TV. */
const ROW_LIMIT = 20;

const FIELDS = [ ItemFields.Overview, ItemFields.PrimaryImageAspectRatio ];
const IMAGE_TYPES = [ ImageType.Primary, ImageType.Thumb, ImageType.Backdrop ];

/** Live TV programs airing now. Empty when no tuner or guide is set up. */
export const useLiveTvOnNow = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Discover', 'LiveTvOnNow', user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getLiveTvApi(api!).getRecommendedPrograms({
                userId: user!.Id!,
                isAiring: true,
                limit: ROW_LIMIT,
                fields: [ ItemFields.ChannelInfo, ItemFields.PrimaryImageAspectRatio ],
                enableImageTypes: IMAGE_TYPES,
                imageTypeLimit: 1,
                enableTotalRecordCount: false
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id && !!user.Policy?.EnableLiveTvAccess
    });
};

/** Live TV recordings, newest first. Empty when nothing was recorded. */
export const useRecordings = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Discover', 'Recordings', user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getLiveTvApi(api!).getRecordings({
                userId: user!.Id!,
                limit: ROW_LIMIT,
                fields: FIELDS,
                enableImageTypes: IMAGE_TYPES,
                imageTypeLimit: 1,
                enableTotalRecordCount: false
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id && !!user.Policy?.EnableLiveTvAccess
    });
};
