import { BaseItemKind as BaseItemKindValue, type BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemFilter } from '@jellyfin/sdk/lib/generated-client/models/item-filter';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getFilterApi } from '@jellyfin/sdk/lib/utils/api/filter-api';
import { getGenreApi } from '@jellyfin/sdk/lib/utils/api/genre-api';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { getShowApi } from '@jellyfin/sdk/lib/utils/api/show-api';
import { getStudioApi } from '@jellyfin/sdk/lib/utils/api/studio-api';
import { getYearApi } from '@jellyfin/sdk/lib/utils/api/year-api';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { getPufferfin } from '../../../api/client';

import { getNextPageStart, LIBRARY_PAGE_SIZE } from '../utils/library';

/** The books of a library, one entry per book (see `PufferfinBooksController` on the server). */
const BOOKS_PATH = '/Pufferfin/Library/Books';

interface BooksPage {
    Items?: ItemDto[]
    TotalRecordCount?: number
}

/** Newest first, the one order other than by name the books of a library come in. */
const isNewestFirst = (sortBy: ItemSortBy[] | undefined) =>
    sortBy?.length === 1 && sortBy[0] === ItemSortBy.DateCreated;

/** The listing of a library of books, by name or newest first, without a genre or a studio: that one comes book by book. */
const isBookListing = (itemTypes: BaseItemKind[] | null, filter: LibraryItemsFilter) =>
    !!itemTypes?.includes(BaseItemKindValue.AudioBook)
    && !filter.genreId && !filter.tag && !filter.studioId && !filter.isServerWide
    && !filter.years?.length && !filter.isUnplayed && !filter.searchTerm
    && (!filter.sortBy || isNewestFirst(filter.sortBy));

/** Sort of the Pufferfin books endpoint. */
const BOOKS_NEWEST_FIRST = 'DateCreated';

const ROW_LIMIT = 20;
const FIELDS = [ ItemFields.Overview, ItemFields.PrimaryImageAspectRatio ];
const IMAGE_TYPES = [ ImageType.Primary, ImageType.Thumb, ImageType.Backdrop ];

/** Narrows a library grid: one genre, one network, or another order than by name. */
export interface LibraryItemsFilter {
    genreId?: string
    /** Only the titles with this tag. */
    tag?: string
    studioId?: string
    /** Newest first when set, by name otherwise. */
    sortBy?: ItemSortBy[]
    /** The order of `sortBy`; without it, descending when `sortBy` is set, ascending by name otherwise. */
    sortOrder?: SortOrder
    /** Only the titles of these years. */
    years?: number[]
    /** Only the titles not watched yet. */
    isUnplayed?: boolean
    /** Only the titles whose name holds these words. */
    searchTerm?: string
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
            // A library of books lists one entry per book: the server groups the files of a book told in parts
            if (isBookListing(itemTypes, filter)) {
                const books = await getPufferfin<BooksPage>(api!, BOOKS_PATH, {
                    params: {
                        parentId,
                        sortBy: filter.sortBy ? BOOKS_NEWEST_FIRST : undefined,
                        startIndex: pageParam,
                        limit: LIBRARY_PAGE_SIZE
                    },
                    signal
                });
                return {
                    items: books.Items ?? [],
                    startIndex: pageParam,
                    totalCount: books.TotalRecordCount ?? 0
                };
            }

            const response = await getLibraryApi(api!).getItems({
                userId: user!.Id!,
                parentId: filter.isServerWide ? undefined : parentId,
                recursive: true,
                includeItemTypes: itemTypes ?? undefined,
                genreIds: filter.genreId ? [ filter.genreId ] : undefined,
                tags: filter.tag ? [ filter.tag ] : undefined,
                studioIds: filter.studioId ? [ filter.studioId ] : undefined,
                sortBy: filter.sortBy ?? [ ItemSortBy.SortName ],
                sortOrder: [ filter.sortOrder ?? (filter.sortBy ? SortOrder.Descending : SortOrder.Ascending) ],
                years: filter.years,
                filters: filter.isUnplayed ? [ ItemFilter.IsUnplayed ] : undefined,
                searchTerm: filter.searchTerm,
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

/** Audiobooks to pick up where the user stopped, one entry per book, last listened first. */
export const useResumeAudioItems = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Library', 'ResumeAudio', user?.Id ],
        queryFn: async ({ signal }) => {
            const books = await getPufferfin<BooksPage>(api!, BOOKS_PATH, {
                params: { inProgress: true, limit: ROW_LIMIT },
                signal
            });
            return books.Items ?? [];
        },
        enabled: !!api && !!user?.Id
    });
};

/** The genres of one library, by name, for the Genres tab. */
export const useLibraryGenres = (parentId: string | undefined, itemTypes: BaseItemKind[] | null, isServerWide = false) => {
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
        enabled: !!api && !!user?.Id && (!!parentId || isServerWide)
    });
};

/** The tags of the titles of one library by name, for the Tag menu. */
export const useLibraryTags = (parentId: string | undefined, itemTypes: BaseItemKind[] | null, isServerWide = false) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Library', 'Tags', parentId, itemTypes, user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getFilterApi(api!).getQueryFiltersLegacy({
                userId: user!.Id!,
                parentId,
                includeItemTypes: itemTypes ?? undefined
            }, { signal });
            return [ ...(response.data.Tags ?? []) ].sort((a, b) => a.localeCompare(b));
        },
        enabled: !!api && !!user?.Id && (!!parentId || isServerWide) && itemTypes !== null
    });
};

/** The years of the titles of one library, for the decades of the Year menu. */
export const useLibraryYears = (parentId: string | undefined, itemTypes: BaseItemKind[] | null, isServerWide = false) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Library', 'Years', parentId, itemTypes, user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getYearApi(api!).getYears({
                userId: user!.Id!,
                parentId,
                includeItemTypes: itemTypes ?? undefined,
                recursive: true,
                enableImages: false
            }, { signal });
            return (response.data.Items ?? []).map(year => year.ProductionYear ?? Number(year.Name));
        },
        enabled: !!api && !!user?.Id && (!!parentId || isServerWide) && itemTypes !== null
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

