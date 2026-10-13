import type { Api } from '@jellyfin/sdk';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import type { BaseItemPerson } from '@jellyfin/sdk/lib/generated-client/models/base-item-person';
import { getImageApi } from '@jellyfin/sdk/lib/utils/api/image-api';

import type { ItemDto } from 'types/base/models/item-dto';
import { ItemKind } from 'types/base/models/item-kind';

/** An audiobook cover is square: the 'square' shape, never stretched into a poster. */
export type CardShape = 'landscape' | 'portrait' | 'square';

interface ImageSource {
    itemId: string
    type: ImageType
    tag: string
}

const source = (
    itemId: string | null | undefined,
    type: ImageType,
    tag: string | null | undefined
): ImageSource | undefined => (itemId && tag ? { itemId, type, tag } : undefined);

function getLandscapeSources(item: ItemDto) {
    const own = item.Type === ItemKind.Episode ?
        [ source(item.Id, ImageType.Primary, item.ImageTags?.Primary) ] :
        [
            source(item.Id, ImageType.Thumb, item.ImageTags?.Thumb),
            source(item.Id, ImageType.Backdrop, item.BackdropImageTags?.[0])
        ];

    return own.concat(
        source(item.ParentThumbItemId, ImageType.Thumb, item.ParentThumbImageTag),
        source(item.ParentBackdropItemId, ImageType.Backdrop, item.ParentBackdropImageTags?.[0]),
        source(item.Id, ImageType.Primary, item.ImageTags?.Primary)
    );
}

function getPortraitSources(item: ItemDto) {
    return [
        item.Type === ItemKind.Episode ?
            source(item.SeriesId, ImageType.Primary, item.SeriesPrimaryImageTag) :
            undefined,
        source(item.Id, ImageType.Primary, item.ImageTags?.Primary)
    ];
}

function getBackdropSources(item: ItemDto) {
    return [
        source(item.Id, ImageType.Backdrop, item.BackdropImageTags?.[0]),
        source(item.ParentBackdropItemId, ImageType.Backdrop, item.ParentBackdropImageTags?.[0])
    ];
}

function toUrl(api: Api, sources: Array<ImageSource | undefined>, maxWidth: number) {
    const found = sources.filter(Boolean)[0];
    if (!found) return undefined;

    return getImageApi(api).getItemImageUrlById(found.itemId, found.type, {
        tag: found.tag,
        maxWidth,
        quality: 90
    });
}

/** Image for a card, falling back from the item's own art to its parent's. */
export function getCardImageUrl(api: Api, item: ItemDto, shape: CardShape) {
    // A book shows its own cover, whatever the shape asked: it has no still nor backdrop
    if (shape === 'square' || isAudiobookItem(item)) {
        return toUrl(api, [ source(item.Id, ImageType.Primary, item.ImageTags?.Primary) ], 400);
    }
    return shape === 'landscape' ?
        toUrl(api, getLandscapeSources(item), 640) :
        toUrl(api, getPortraitSources(item), 400);
}

/** An audiobook of the library: the book itself, or the folder that groups its parts. */
export function isAudiobookItem(item: { Type?: string | null }): boolean {
    return item.Type === ItemKind.AudioBook || item.Type === ItemKind.Folder;
}

/**
 * The shape a card takes for what it shows: an audiobook is always square,
 * whatever row it sits in. Anything else keeps the shape asked.
 */
export function getCardShape(shape: CardShape, value: unknown): CardShape {
    if (typeof value !== 'object' || value === null) return shape;
    const { Type, Kind } = value as { Type?: unknown, Kind?: unknown };
    if (Kind === 'Audiobook') return 'square';
    if (typeof Type === 'string' && isAudiobookItem({ Type })) return 'square';
    return shape;
}

/** Full width background art for the featured area. */
export function getBackdropUrl(api: Api, item: ItemDto) {
    return toUrl(api, getBackdropSources(item), 1920);
}

/** Portrait of a cast or crew member. */
export function getPersonImageUrl(api: Api, person: BaseItemPerson) {
    return toUrl(api, [ source(person.Id, ImageType.Primary, person.PrimaryImageTag) ], 300);
}

/** Poster of a library item known only by its id, such as a catalog entry found on disk. */
export function getItemPosterUrl(api: Api, itemId: string) {
    return getImageApi(api).getItemImageUrlById(itemId, ImageType.Primary, { maxWidth: 400, quality: 90 });
}

/** Square cover of an audiobook: the first of the items given that has one, such as the book then its first part. */
export function getCoverUrl(api: Api, items: ItemDto[], maxWidth: number) {
    return toUrl(api, items.map(item => source(item.Id, ImageType.Primary, item.ImageTags?.Primary)), maxWidth);
}
