import type { Api } from '@jellyfin/sdk';
import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { getShowApi } from '@jellyfin/sdk/lib/utils/api/show-api';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';

import { playbackManager } from 'components/playback/playbackmanager';
import type { ItemDto } from 'types/base/models/item-dto';
import { ItemKind } from 'types/base/models/item-kind';

import { isResumable } from './items';

/** Plays an item, from where the user stopped when there is a saved position. */
export function playItem(item: ItemDto) {
    playbackManager.play({
        items: [ item ],
        startPositionTicks: isResumable(item) ? item.UserData?.PlaybackPositionTicks : 0
    }).catch((err: unknown) => {
        console.error('[Pufferfin] Failed to start playback', err);
    });
}

/** Plays a library item known only by its id, reading it first for the saved position. */
export async function playItemById(api: Api, userId: string, itemId: string) {
    try {
        const response = await getLibraryApi(api).getItem({ userId, itemId });
        playItem(response.data as ItemDto);
    } catch (err) {
        console.error('[Pufferfin] Failed to read the item to play', err);
    }
}

/**
 * Plays an audiobook. A book told in several files comes as its folder (see
 * the Pufferfin books of a library): its parts play in order, from the first
 * one not finished yet, where the user stopped in it.
 */
export async function playAudiobook(api: Api, userId: string, item: ItemDto) {
    if (item.Type !== ItemKind.Folder || !item.Id) {
        playItem(item);
        return;
    }

    try {
        const response = await getLibraryApi(api).getItems({
            userId,
            parentId: item.Id,
            includeItemTypes: [ BaseItemKind.AudioBook ],
            sortBy: [ ItemSortBy.SortName ],
            enableUserData: true
        });
        const parts = (response.data.Items ?? []) as ItemDto[];
        if (!parts.length) return;
        const startIndex = Math.max(0, parts.findIndex(part => !part.UserData?.Played));
        const start = parts[startIndex];
        await playbackManager.play({
            items: parts,
            startIndex,
            startPositionTicks: start && isResumable(start) ? start.UserData?.PlaybackPositionTicks : 0
        });
    } catch (err) {
        console.error('[Pufferfin] Failed to play the audiobook', err);
    }
}

/** Plays an audiobook known only by its library id: a file, or the folder of a book in parts. */
export async function playAudiobookById(api: Api, userId: string, itemId: string) {
    try {
        const response = await getLibraryApi(api).getItem({ userId, itemId });
        await playAudiobook(api, userId, response.data as ItemDto);
    } catch (err) {
        console.error('[Pufferfin] Failed to read the audiobook to play', err);
    }
}

export function playTrailers(item: ItemDto) {
    playbackManager.playTrailers(item).catch((err: unknown) => {
        console.error('[Pufferfin] Failed to play trailers', err);
    });
}

/**
 * Plays a title from a list where only the title is known: a series starts its
 * next episode to watch, or the series from the start when there is none.
 */
export async function playTitle(api: Api, userId: string, item: ItemDto) {
    if (item.Type !== ItemKind.Series || !item.Id) {
        playItem(item);
        return;
    }

    try {
        const response = await getShowApi(api).getNextUp({
            seriesId: item.Id,
            userId,
            limit: 1,
            enableTotalRecordCount: false
        });
        playItem((response.data.Items?.[0] as ItemDto | undefined) ?? item);
    } catch (err) {
        console.error('[Pufferfin] Failed to find the next episode', err);
        playItem(item);
    }
}
