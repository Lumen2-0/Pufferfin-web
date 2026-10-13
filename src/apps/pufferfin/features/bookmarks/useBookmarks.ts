import { useCallback, useMemo } from 'react';

import type { CatalogTitleKind } from '../../routes/paths';
import { useUserPreference } from '../../utils/userPreference';
import { type Bookmark, BOOKMARKS_SETTING, isSameBookmark, parseBookmarks, toggleBookmark } from './bookmarks';

/** The bookmarks of the user, and how to add or take out one. */
export function useBookmarks() {
    const [ value, setValue ] = useUserPreference(BOOKMARKS_SETTING);
    const bookmarks = useMemo(() => parseBookmarks(value), [ value ]);

    const toggle = useCallback((bookmark: Bookmark) => {
        const next = toggleBookmark(bookmarks, bookmark);
        setValue(next.length ? JSON.stringify(next) : null);
    }, [ bookmarks, setValue ]);

    const isBookmarked = useCallback(
        (kind: CatalogTitleKind, tmdbId: number) => bookmarks.some(entry => isSameBookmark(entry, { kind, tmdbId })),
        [ bookmarks ]
    );

    return { bookmarks, toggle, isBookmarked };
}
