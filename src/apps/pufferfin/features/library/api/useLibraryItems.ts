import { BaseItemKind as BaseItemKindValue, type BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getGenreApi } from '@jellyfin/sdk/lib/utils/api/genre-api';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { getShowApi } from '@jellyfin/sdk/lib/utils/api/show-api';
import { getStudioApi } from '@jellyfin/sdk/lib/utils/api/studio-api';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { getNextPageStart, LIBRARY_PAGE_SIZE } from '../utils/library';

const ROW_LIMIT = 20;
const FIELDS = [ ItemFields.Overview, ItemFields.PrimaryImageAspectRatio ];
const IMAGE_TYPES = [ ImageType.Primary, ImageType.Thumb, ImageType.Backdrop ];

/** Narrows a library grid: one genre, one network, or another order than by name. */
export interface LibraryItemsFilter {
    genreId?: string
    studioId?: string
    /** Newest first when set, by name otherwise. */
    sortBy?: ItemSortBy[]
    /** Across every library rather than one, such as the collections of the server. */
    isServerWide?: boolean
}

/**
 * The titles of one library, by name, a page at a time. Nothing from the
 * catalog comes here: every title is on disk and playable.
 */
export const useLibraryItems = (
    parentId: string | undefined,
    itemTypes: BaseItemKind[] | null,
    filter: LibraryItemsFilter = {}
) => {
    const { api, user } = useApi();
    return useInfiniteQuery({
        queryKey: [ 'Pufferfin', 'Library', parentId, itemTypes, filter, user?.Id ],
        queryFn: async ({ pageParam, signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user!.Id!,
                parentId: filter.isServerWide ? undefined : parentId,
                recursive: true,
                includeItemTypes: itemTypes ?? undefined,
                genreIds: filter.genreId ? [ filter.genreId ] : undefined,
                studioIds: filter.studioId ? [ filter.studioId ] : undefined,
                sortBy: filter.sortBy ?? [ ItemSortBy.SortName ],
                sortOrder: [ filter.sortBy ? SortOrder.Descending : SortOrder.Ascending ],
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
        enabled: !!api && !!user?.Id && (!!parentId || !!filter.isServerWide) && itemTypes !== null
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

/** The genres of one library, by name, for the Genres tab. */
export const useLibraryGenres = (parentId: string | undefined, itemTypes: BaseItemKind[] | null) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Library', 'Genres', parentId, itemTypes, user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getGenreApi(api!).getGenres({
                userId: user!.Id!,
                parentId,
                includeItemTypes: itemTypes ?? undefined,
                sortBy: [ ItemSortBy.SortName ],
                sortOrder: [ SortOrder.Ascending ],
                enableTotalRecordCount: false
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id && !!parentId
    });
};

/** The networks of one library of series, by name, for the Networks tab. */
export const useLibraryStudios = (parentId: string | undefined) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Library', 'Studios', parentId, user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getStudioApi(api!).getStudios({
                userId: user!.Id!,
                parentId,
                includeItemTypes: [ BaseItemKindValue.Series ],
                enableTotalRecordCount: false
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id && !!parentId
    });
};

/** Episodes of the series of one library airing soon, for the Upcoming tab. They are not on disk yet. */
export const useUpcomingEpisodes = (parentId: string | undefined) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Library', 'Upcoming', parentId, user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getShowApi(api!).getUpcomingEpisodes({
                userId: user!.Id!,
                parentId,
                limit: ROW_LIMIT * 2,
                fields: FIELDS,
                enableImageTypes: IMAGE_TYPES,
                imageTypeLimit: 1
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id && !!parentId
    });
};

/** What to resume in one library, for the Suggestions tab. */
export const useLibraryResume = (parentId: string | undefined) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Library', 'Resume', parentId, user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getResumeItems({
                userId: user!.Id!,
                parentId,
                limit: ROW_LIMIT,
                fields: FIELDS,
                enableImageTypes: IMAGE_TYPES,
                imageTypeLimit: 1,
                enableTotalRecordCount: false
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id && !!parentId
    });
};

/** The next episodes to watch in one library of series, for the Suggestions tab. */
export const useLibraryNextUp = (parentId: string | undefined, isEnabled: boolean) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Library', 'NextUp', parentId, user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getShowApi(api!).getNextUp({
                userId: user!.Id!,
                parentId,
                limit: ROW_LIMIT,
                fields: FIELDS,
                enableImageTypes: IMAGE_TYPES,
                imageTypeLimit: 1,
                enableTotalRecordCount: false
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id && !!parentId && isEnabled
    });
};
