import React, { type FC, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import MediaRow from '../../components/MediaRow';
import PosterCard from '../../components/PosterCard';
import { useTranslation } from '../../i18n/useTranslation';
import { getCatalogTitlePath, type CatalogTitleKind } from '../../routes/paths';
import type { Bookmark } from './bookmarks';
import { useBookmarks } from './useBookmarks';

const getKey = (bookmark: Bookmark) => `${bookmark.kind}-${bookmark.tmdbId}`;

/** The titles the user put aside, the last one first; only films or series when the screen is about one of them. */
const BookmarksRow: FC<{ kind?: CatalogTitleKind }> = ({ kind }) => {
    const t = useTranslation();
    const navigate = useNavigate();
    const { bookmarks, toggle } = useBookmarks();
    const shown = useMemo(() => (kind ? bookmarks.filter(bookmark => bookmark.kind === kind) : bookmarks), [ bookmarks, kind ]);

    // A bookmark opens the sheet of its title, which is the library one once it is on disk
    const open = useCallback((bookmark: Bookmark) => navigate(getCatalogTitlePath(bookmark.kind, bookmark.tmdbId)), [ navigate ]);

    const renderItem = useCallback((bookmark: Bookmark) => (
        <PosterCard
            title={bookmark.title}
            subtitle={bookmark.year ? String(bookmark.year) : undefined}
            imageUrl={bookmark.posterUrl ?? undefined}
            shape='portrait'
            value={bookmark}
            onSelect={open}
            onDismiss={toggle}
            dismissLabel={t('ActionRemoveBookmark')}
        />
    ), [ open, t, toggle ]);

    return (
        <MediaRow
            title={t('RowBookmarks')}
            shape='portrait'
            items={shown}
            isPending={false}
            isError={false}
            getKey={getKey}
            renderItem={renderItem}
        />
    );
};

export default BookmarksRow;
