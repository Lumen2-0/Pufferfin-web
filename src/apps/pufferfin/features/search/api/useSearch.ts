import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { getPersonApi } from '@jellyfin/sdk/lib/utils/api/person-api';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { isSearchable, normalizeQuery } from '../utils/query';

/**
 * Library search. Catalog results (TMDB titles missing from the disk, Audible
 * audiobooks) come with the server catalog.
 */

const RESULT_LIMIT = 24;

export const useTitleSearch = (query: string) => {
    const { api, user } = useApi();
    const searchTerm = normalizeQuery(query);
    return useQuery({
        queryKey: [ 'Pufferfin', 'Search', 'Titles', searchTerm, user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user!.Id!,
                searchTerm,
                recursive: true,
                includeItemTypes: [ BaseItemKind.Movie, BaseItemKind.Series ],
                limit: RESULT_LIMIT * 2,
                fields: [ ItemFields.PrimaryImageAspectRatio ],
                enableImageTypes: [ ImageType.Primary ],
                imageTypeLimit: 1,
                enableTotalRecordCount: false
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        // Results stay on screen while the next query loads, instead of flashing empty
        placeholderData: keepPreviousData,
        enabled: !!api && !!user?.Id && isSearchable(searchTerm)
    });
};

export const usePeopleSearch = (query: string) => {
    const { api, user } = useApi();
    const searchTerm = normalizeQuery(query);
    return useQuery({
        queryKey: [ 'Pufferfin', 'Search', 'People', searchTerm, user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getPersonApi(api!).getPersons({
                userId: user!.Id!,
                searchTerm,
                limit: RESULT_LIMIT,
                enableImageTypes: [ ImageType.Primary ],
                imageTypeLimit: 1
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        placeholderData: keepPreviousData,
        enabled: !!api && !!user?.Id && isSearchable(searchTerm)
    });
};
