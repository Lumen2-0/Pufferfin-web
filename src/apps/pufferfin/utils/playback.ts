import type { Api } from '@jellyfin/sdk';
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
