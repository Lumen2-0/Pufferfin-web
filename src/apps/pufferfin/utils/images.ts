import type { Api } from '@jellyfin/sdk';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { getImageApi } from '@jellyfin/sdk/lib/utils/api/image-api';

import type { ItemDto } from 'types/base/models/item-dto';
import { ItemKind } from 'types/base/models/item-kind';

export type CardShape = 'landscape' | 'portrait';

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
    return shape === 'landscape' ?
        toUrl(api, getLandscapeSources(item), 640) :
        toUrl(api, getPortraitSources(item), 400);
}

/** Full width background art for the featured area. */
export function getBackdropUrl(api: Api, item: ItemDto) {
    return toUrl(api, getBackdropSources(item), 1920);
}
