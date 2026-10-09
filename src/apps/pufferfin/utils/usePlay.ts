import { useCallback } from 'react';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { playLibraryItem, playLibraryItemById } from './playback';

/** Play of a library item from its card. */
export function usePlayItem() {
    const { api, user } = useApi();
    return useCallback((item: ItemDto) => {
        if (api && user?.Id) void playLibraryItem(api, user.Id, item);
    }, [ api, user?.Id ]);
}

/** Play of a library item known by its id, from a catalog card of a title on disk. */
export function usePlayItemId() {
    const { api, user } = useApi();
    return useCallback((itemId: string | undefined) => {
        if (api && user?.Id && itemId) void playLibraryItemById(api, user.Id, itemId);
    }, [ api, user?.Id ]);
}
