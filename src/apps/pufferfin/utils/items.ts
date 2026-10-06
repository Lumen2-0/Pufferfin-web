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

const TICKS_PER_MINUTE = 600_000_000;

/** Runtime split into whole hours and minutes, or undefined when unknown or under a minute. */
export function getRuntime(ticks: number | null | undefined): { hours: number, minutes: number } | undefined {
    if (!ticks || ticks < TICKS_PER_MINUTE) return undefined;
    const total = Math.round(ticks / TICKS_PER_MINUTE);
    return { hours: Math.floor(total / 60), minutes: total % 60 };
}
