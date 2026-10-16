import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

import type { PlayedItem } from '../utils/stats';

export interface WatchHistory {
    items: PlayedItem[]
    seriesGenres: Map<string, string[]>
}

// ponytail: fake history to preview the page, set to false to read the real one
const USE_DEMO = true;

const HOUR = 36_000_000_000;
const demoItem = (type: string, date: string, hours: number, genres: string[], plays = 1, extra: Partial<PlayedItem> = {}): PlayedItem => ({
    ...extra,
    Type: type, RunTimeTicks: hours * HOUR, Genres: genres, UserData: { LastPlayedDate: date, PlayCount: plays }
});
const DEMO: WatchHistory = {
    items: [
        ...Array.from({ length: 14 }, (_, i) => demoItem('Movie', `2026-0${(i % 6) + 1}-1${i % 9}T20:00:00`, 1.8 + (i % 3) * 0.3, [ 'Action', 'Science-Fiction' ])),
        ...Array.from({ length: 9 }, (_, i) => demoItem('Movie', `2026-1${i % 3}-0${(i % 9) + 1}T21:00:00`, 1.6, [ 'Drame', 'Thriller' ], 2)),
        ...Array.from({ length: 70 }, (_, i) => demoItem('Episode', `2026-0${(i % 9) + 1}-2${i % 8}T22:00:00`, 0.7, [ 'Comedie', 'Animation' ])),
        ...Array.from({ length: 30 }, (_, i) => demoItem('Episode', `2025-0${(i % 9) + 1}-1${i % 9}T19:00:00`, 0.8, [ 'Drame', 'Crime' ])),
        ...Array.from({ length: 6 }, (_, i) => demoItem('Movie', `2025-1${i % 3}-1${i}T20:30:00`, 2, [ 'Horreur' ]))
    ],
    seriesGenres: new Map()
};

/** Every film and episode the user played, and the genres of the series the episodes belong to. */
export const useWatchHistory = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'WatchHistory', USE_DEMO, user?.Id ],
        queryFn: async ({ signal }): Promise<WatchHistory> => {
            if (USE_DEMO) {
                // Real titles of the library, so the posters show, with invented plays
                const real = await getLibraryApi(api!).getItems({
                    userId: user!.Id!,
                    recursive: true,
                    includeItemTypes: [ BaseItemKind.Movie, BaseItemKind.Series ],
                    fields: [ ItemFields.Genres ],
                    limit: 24,
                    enableImages: false,
                    enableTotalRecordCount: false
                }, { signal }).then(response => response.data.Items ?? []).catch(() => []);
                const titled = real.flatMap((item, index): PlayedItem[] => {
                    const date = `2026-0${(index % 9) + 1}-1${index % 9}T20:00:00`;
                    if (item.Type === BaseItemKind.Series) {
                        return Array.from({ length: 4 + (index % 7) * 3 }, (_, episode) => demoItem(
                            'Episode', date, 0.7, item.Genres ?? [], 1, { SeriesId: item.Id, SeriesName: item.Name, Id: `${item.Id}-${episode}` }
                        ));
                    }
                    return [ demoItem('Movie', date, 1.5 + (index % 4) * 0.4, item.Genres ?? [], 1 + (index % 3 === 0 ? 1 : 0), { Id: item.Id, Name: item.Name }) ];
                });
                return { items: [ ...DEMO.items, ...titled ], seriesGenres: DEMO.seriesGenres };
            }
            const libraryApi = getLibraryApi(api!);
            const common = { userId: user!.Id!, recursive: true, enableImages: false, enableTotalRecordCount: false };
            const [ played, series ] = await Promise.all([
                libraryApi.getItems({
                    ...common,
                    isPlayed: true,
                    includeItemTypes: [ BaseItemKind.Movie, BaseItemKind.Episode ],
                    fields: [ ItemFields.Genres ]
                }, { signal }),
                libraryApi.getItems({
                    ...common,
                    includeItemTypes: [ BaseItemKind.Series ],
                    fields: [ ItemFields.Genres ]
                }, { signal })
            ]);
            return {
                items: (played.data.Items ?? []) as PlayedItem[],
                seriesGenres: new Map((series.data.Items ?? []).map(item => [ item.Id!, item.Genres ?? [] ]))
            };
        },
        enabled: USE_DEMO || (!!api && !!user?.Id),
        staleTime: 5 * 60 * 1000
    });
};
