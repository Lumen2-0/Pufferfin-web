import type { ItemDto } from 'types/base/models/item-dto';
import { ItemKind } from 'types/base/models/item-kind';

import { CatalogItemKind } from '../../catalog/api/types';
import { useCatalogTitle } from '../../catalog/api/useCatalog';

/**
 * The cast TMDB knows for a film or a series of the library that holds no
 * actors for it. `isNeeded` is false, and nothing is fetched, when the library
 * has its own cast or the title has no TMDB id.
 */
export function useCatalogCast(item: ItemDto | undefined, hasLibraryCast: boolean) {
    const isTitle = item?.Type === ItemKind.Movie || item?.Type === ItemKind.Series;
    const tmdbId = Number(item?.ProviderIds?.Tmdb) || 0;
    const isNeeded = isTitle && !hasLibraryCast && tmdbId > 0;
    const kind = item?.Type === ItemKind.Series ? CatalogItemKind.Series : CatalogItemKind.Movie;
    const title = useCatalogTitle(kind, tmdbId, isNeeded);
    return { isNeeded, cast: title.data?.Cast, isPending: title.isPending };
}
