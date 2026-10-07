import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { CollectionType } from '@jellyfin/sdk/lib/generated-client/models/collection-type';

/** Enough titles to fill a TV screen a few times over without a slow first load. */
export const LIBRARY_PAGE_SIZE = 60;

/**
 * What a library page lists, by the collection type of the library. Null for
 * a library Pufferfin has no page for yet (live TV): it opens upstream.
 */
export function getViewItemTypes(collectionType: string | null | undefined): BaseItemKind[] | null {
    switch (collectionType) {
        case CollectionType.Movies:
            return [ BaseItemKind.Movie ];
        case CollectionType.Tvshows:
            return [ BaseItemKind.Series ];
        case CollectionType.Music:
            return [ BaseItemKind.MusicAlbum ];
        case CollectionType.Musicvideos:
            return [ BaseItemKind.MusicVideo ];
        case CollectionType.Books:
            return [ BaseItemKind.Book, BaseItemKind.AudioBook ];
        case CollectionType.Homevideos:
            return [ BaseItemKind.Video, BaseItemKind.Photo ];
        case CollectionType.Boxsets:
            return [ BaseItemKind.BoxSet ];
        case CollectionType.Playlists:
            return [ BaseItemKind.Playlist ];
        case CollectionType.Livetv:
            return null;
        default:
            // Mixed libraries hold films, series and loose videos
            return [ BaseItemKind.Movie, BaseItemKind.Series, BaseItemKind.Video, BaseItemKind.MusicVideo ];
    }
}

/**
 * Whether a library gets a "Recently added" row on the library tab, as on the
 * upstream home: not for live TV, collections and playlists, nor for the
 * libraries the user excluded in their home settings.
 */
export function hasLatestRow(
    view: { Id?: string | null, CollectionType?: string | null },
    excludedIds: readonly string[] = []
): boolean {
    if (!view.Id || excludedIds.includes(view.Id)) return false;
    return view.CollectionType !== CollectionType.Livetv
        && view.CollectionType !== CollectionType.Boxsets
        && view.CollectionType !== CollectionType.Playlists;
}

interface LibraryPage {
    items: unknown[]
    startIndex: number
    totalCount: number
}

/** Start index of the next page, or undefined once every title is loaded or a page comes back empty. */
export function getNextPageStart(lastPage: LibraryPage): number | undefined {
    const next = lastPage.startIndex + lastPage.items.length;
    if (lastPage.items.length === 0 || next >= lastPage.totalCount) return undefined;
    return next;
}

/**
 * Whether a library entry is an audiobook: a file, or the folder of a book
 * told in several files, as the books of a library come from the server.
 */
export function isAudiobookEntry(item: { Type?: string | null }): boolean {
    return item.Type === BaseItemKind.AudioBook || item.Type === BaseItemKind.Folder;
}
