import { CollectionType } from '@jellyfin/sdk/lib/generated-client/models/collection-type';

import type { StringKey } from '../../../i18n/translate';

/** The tabs of a library page, as the upstream library pages offer them. */
export enum LibraryTab {
    All = 'all',
    Suggestions = 'suggestions',
    Upcoming = 'upcoming',
    Genres = 'genres',
    Networks = 'networks',
    Collections = 'collections',
    Episodes = 'episodes'
}

export const LIBRARY_TAB_PARAM = 'tab';
/** The chosen genre or network of the Genres and Networks tabs. */
export const LIBRARY_FILTER_PARAM = 'filter';

export const LIBRARY_TAB_LABELS: Record<LibraryTab, StringKey> = {
    [LibraryTab.All]: 'LibraryTabAll',
    [LibraryTab.Suggestions]: 'LibraryTabSuggestions',
    [LibraryTab.Upcoming]: 'LibraryTabUpcoming',
    [LibraryTab.Genres]: 'LibraryTabGenres',
    [LibraryTab.Networks]: 'LibraryTabNetworks',
    [LibraryTab.Collections]: 'LibraryTabCollections',
    [LibraryTab.Episodes]: 'LibraryTabEpisodes'
};

/**
 * The tabs of a library, by its collection type, in the upstream order.
 * Films and series get their upstream tabs; the other libraries their grid
 * and genres.
 */
export function getLibraryTabs(collectionType: string | null | undefined): LibraryTab[] {
    switch (collectionType) {
        case CollectionType.Movies:
            return [ LibraryTab.All, LibraryTab.Suggestions, LibraryTab.Genres, LibraryTab.Collections ];
        case CollectionType.Tvshows:
            return [ LibraryTab.All, LibraryTab.Suggestions, LibraryTab.Upcoming, LibraryTab.Genres, LibraryTab.Networks, LibraryTab.Episodes ];
        case CollectionType.Boxsets:
        case CollectionType.Playlists:
            return [ LibraryTab.All ];
        default:
            return [ LibraryTab.All, LibraryTab.Genres ];
    }
}

/** Reads the tab of the address; a tab the library does not have falls back to All. */
export function parseLibraryTab(value: string | null | undefined, tabs: readonly LibraryTab[]): LibraryTab {
    return tabs.find(tab => tab === value) ?? LibraryTab.All;
}
