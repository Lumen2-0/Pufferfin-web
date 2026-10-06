import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { appRouter } from 'components/router/appRouter';
import type { ItemDto } from 'types/base/models/item-dto';
import { ItemKind } from 'types/base/models/item-kind';

import { getItemPath } from '../routes/paths';

/**
 * Id of the Pufferfin detail page that shows this item: the item itself for a
 * movie or a series, the series for a season or an episode. Undefined for the
 * types Pufferfin has no screen for yet.
 */
export function getDetailItemId(item: ItemDto): string | undefined {
    switch (item.Type) {
        case ItemKind.Movie:
        case ItemKind.Series:
            return item.Id ?? undefined;
        case ItemKind.Season:
        case ItemKind.Episode:
            return item.SeriesId ?? undefined;
        default:
            return undefined;
    }
}

/** Opens the Pufferfin detail page, or the existing upstream page for other types. */
export function useOpenItem() {
    const navigate = useNavigate();

    return useCallback((item: ItemDto) => {
        const detailId = getDetailItemId(item);
        if (detailId) {
            navigate(getItemPath(detailId));
        } else {
            appRouter.showItem(item);
        }
    }, [ navigate ]);
}
