import type { Api } from '@jellyfin/sdk';
import { getShowApi } from '@jellyfin/sdk/lib/utils/api/show-api';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';

import { playbackManager } from 'components/playback/playbackmanager';
import type { ItemDto } from 'types/base/models/item-dto';
import { ItemKind } from 'types/base/models/item-kind';

import { getPufferfinBook } from '../features/audiobooks/api/usePufferfinBook';

import { isResumable } from './items';
import { quietPlay } from './quietPlay';

const startPositionOf = (item: ItemDto | undefined) =>
    (item && isResumable(item) ? item.UserData?.PlaybackPositionTicks : 0) ?? 0;

/**
 * Plays an item, from where the user stopped when there is a saved position.
 * Playback just starts: no loader over the page (see `quietPlay`).
 */
export function playItem(item: ItemDto) {
    return quietPlay(() => playbackManager.play({
        items: [ item ],
        startPositionTicks: startPositionOf(item)
    }), `item:${item.Id ?? ''}`).catch((err: unknown) => {
        console.error('[Pufferfin] Failed to start playback', err);
    });
}

/** Plays a library item known only by its id, reading it first for the saved position. */
export function playItemById(api: Api, userId: string, itemId: string) {
    return quietPlay(async () => {
        const response = await getLibraryApi(api).getItem({ userId, itemId });
        await playbackManager.play({
            items: [ response.data as ItemDto ],
            startPositionTicks: startPositionOf(response.data as ItemDto)
        });
    }, `item:${itemId}`).catch((err: unknown) => {
        console.error('[Pufferfin] Failed to read the item to play', err);
    });
}

/** Index of the part to start a book at: the first one not finished, else the first. */
export function getStartPart(parts: ItemDto[]): number {
    return Math.max(0, parts.findIndex(part => !part.UserData?.Played));
}

/** Plays the parts of an audiobook in order from one of them, where the user stopped in it. */
export function playAudiobookParts(parts: ItemDto[], startIndex: number) {
    if (!parts.length) return Promise.resolve();
    const start = parts[startIndex];
    return quietPlay(() => playbackManager.play({
        items: parts,
        startIndex,
        startPositionTicks: startPositionOf(start)
    }), `book:${start?.Id ?? ''}`).catch((err: unknown) => {
        console.error('[Pufferfin] Failed to play the audiobook', err);
    });
}

/**
 * Plays an audiobook known by its library id: a file, or the folder of a book
 * told in several files, whose parts play in order from the first one not
 * finished yet.
 */
export function playAudiobookById(api: Api, itemId: string) {
    return quietPlay(async () => {
        const { Parts: parts } = await getPufferfinBook(api, itemId);
        if (!parts.length) return;
        const startIndex = getStartPart(parts);
        await playbackManager.play({
            items: parts,
            startIndex,
            startPositionTicks: startPositionOf(parts[startIndex])
        });
    }, `book:${itemId}`).catch((err: unknown) => {
        console.error('[Pufferfin] Failed to play the audiobook', err);
    });
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
export function playTitle(api: Api, userId: string, item: ItemDto) {
    if (item.Type !== ItemKind.Series || !item.Id) {
        return playItem(item);
    }

    return quietPlay(async () => {
        let next: ItemDto = item;
        try {
            const response = await getShowApi(api).getNextUp({
                seriesId: item.Id!,
                userId,
                limit: 1,
                enableTotalRecordCount: false
            });
            next = (response.data.Items?.[0] as ItemDto | undefined) ?? item;
        } catch (err) {
            console.error('[Pufferfin] Failed to find the next episode', err);
        }
        await playbackManager.play({ items: [ next ], startPositionTicks: startPositionOf(next) });
    }, `title:${item.Id}`).catch((err: unknown) => {
        console.error('[Pufferfin] Failed to start playback', err);
    });
}

/** Kinds of library items a card can play right away; the others open their page. */
const PLAYABLE_KINDS = new Set<string>([
    ItemKind.Movie,
    ItemKind.Series,
    ItemKind.Episode,
    ItemKind.Video,
    ItemKind.MusicVideo,
    ItemKind.AudioBook,
    ItemKind.Folder
]);

/** Whether a library item plays from its card: a film, a series, an episode, a video, an audiobook. */
export const isPlayableItem = (item: ItemDto) => !!item.Id && !!item.Type && PLAYABLE_KINDS.has(item.Type);

/**
 * Plays a library item the way its kind asks: a series from its next episode
 * to watch, an audiobook from the part where the user stopped, the rest from
 * where it was left.
 */
export function playLibraryItem(api: Api, userId: string, item: ItemDto) {
    if (item.Type === ItemKind.AudioBook || item.Type === ItemKind.Folder) return playAudiobookById(api, item.Id!);
    return playTitle(api, userId, item);
}

/** Plays a library item known only by its id, such as a catalog entry found on disk. */
export function playLibraryItemById(api: Api, userId: string, itemId: string) {
    return getLibraryApi(api).getItem({ userId, itemId })
        .then(response => playLibraryItem(api, userId, response.data as ItemDto))
        .catch((err: unknown) => {
            console.error('[Pufferfin] Failed to read the item to play', err);
        });
}
