import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { CatalogItemKind } from '../../catalog/api/types';

/** The last film or series watched, with its TMDB id: what "Because you watched" starts from. */
export interface LastWatched {
    kind: CatalogItemKind.Movie | CatalogItemKind.Series
    tmdbId: number
    title: string
}

/** How many recent plays are looked at to find one known to TMDB. */
const CANDIDATES = 8;

const toLastWatched = (item: ItemDto | undefined, kind: LastWatched['kind']): LastWatched | undefined => {
    const tmdbId = Number(item?.ProviderIds?.Tmdb);
    if (!item || !tmdbId || !item.UserData?.LastPlayedDate) return undefined;
    return { kind, tmdbId, title: item.Name ?? '' };
};

/**
 * The film or series the user played last, of one kind or of both. A series
 * is found through its last played episode. Undefined when nothing was played.
 */
export const useLastWatched = (kinds: Array<LastWatched['kind']>) => {
    const { api, user } = useApi();
    const withMovies = kinds.includes(CatalogItemKind.Movie);
    const withSeries = kinds.includes(CatalogItemKind.Series);
    return useQuery({
        queryKey: [ 'Pufferfin', 'Discover', 'LastWatched', withMovies, withSeries, user?.Id ],
        queryFn: async ({ signal }): Promise<LastWatched | null> => {
            const libraryApi = getLibraryApi(api!);
            const types = [
                ...(withMovies ? [ BaseItemKind.Movie ] : []),
                ...(withSeries ? [ BaseItemKind.Episode ] : [])
            ];
            const recent = await libraryApi.getItems({
                userId: user!.Id!,
                includeItemTypes: types,
                recursive: true,
                sortBy: [ ItemSortBy.DatePlayed ],
                sortOrder: [ SortOrder.Descending ],
                fields: [ ItemFields.ProviderIds ],
                limit: CANDIDATES,
                enableImages: false,
                enableTotalRecordCount: false
            }, { signal });

            for (const item of (recent.data.Items ?? []) as ItemDto[]) {
                if (!item.UserData?.LastPlayedDate) break;
                if (item.Type === BaseItemKind.Movie) {
                    const movie = toLastWatched(item, CatalogItemKind.Movie);
                    if (movie) return movie;
                } else if (item.SeriesId) {
                    // An episode: the series carries the TMDB id
                    const series = await libraryApi.getItems({
                        userId: user!.Id!,
                        ids: [ item.SeriesId ],
                        fields: [ ItemFields.ProviderIds ],
                        enableImages: false,
                        enableTotalRecordCount: false
                    }, { signal });
                    const seriesItem = series.data.Items?.[0] as ItemDto | undefined;
                    const tmdbId = Number(seriesItem?.ProviderIds?.Tmdb);
                    if (seriesItem && tmdbId) {
                        return { kind: CatalogItemKind.Series, tmdbId, title: seriesItem.Name ?? item.SeriesName ?? '' };
                    }
                }
            }
            return null;
        },
        enabled: !!api && !!user?.Id && (withMovies || withSeries),
        staleTime: 10 * 60 * 1000
    });
};
