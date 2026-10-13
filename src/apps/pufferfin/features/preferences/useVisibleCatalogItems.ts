import { useCallback } from 'react';

import type { CatalogItem } from '../catalog/api/types';
import { getOpenableItems } from '../catalog/utils/catalog';
import { isOfHiddenGenre } from './genres';
import { useHiddenGenres } from './useHiddenGenres';

/** Entries a row of Discover or the search can show: ones with a screen to open, of a genre the user did not turn off. */
export function useVisibleCatalogItems() {
    const { hiddenTmdbIds } = useHiddenGenres();
    return useCallback(
        (items: CatalogItem[] | undefined) => getOpenableItems(items)?.filter(item => !isOfHiddenGenre(item, hiddenTmdbIds)),
        [ hiddenTmdbIds ]
    );
}
