import type { ItemDto } from 'types/base/models/item-dto';
import { ItemKind } from 'types/base/models/item-kind';

/** Main title of a card: the series for an episode, the item itself otherwise. */
export function getDisplayTitle(item: ItemDto) {
    if (item.Type === ItemKind.Episode && item.SeriesName) return item.SeriesName;
    return item.Name ?? '';
}

/** Season and episode numbers of an episode, when both are known. */
export function getEpisodeNumbers(item: ItemDto): [ number, number ] | undefined {
    if (item.Type !== ItemKind.Episode) return undefined;
    if (item.ParentIndexNumber == null || item.IndexNumber == null) return undefined;
    return [ item.ParentIndexNumber, item.IndexNumber ];
}

/** Watched share in whole percents, or undefined when nothing was watched. */
export function getPlayedPercentage(item: ItemDto) {
    const percentage = item.UserData?.PlayedPercentage;
    if (!percentage || percentage <= 0) return undefined;
    return Math.min(100, Math.round(percentage));
}

/** True when playback should start where the user stopped. */
export function isResumable(item: ItemDto) {
    return (item.UserData?.PlaybackPositionTicks ?? 0) > 0;
}
