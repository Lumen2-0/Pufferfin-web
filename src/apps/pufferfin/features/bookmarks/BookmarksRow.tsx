import React, { type FC, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import CardQuickActions from '../../components/CardQuickActions';
import MediaRow from '../../components/MediaRow';
import PosterCard from '../../components/PosterCard';
import { CatalogAvailability, type CatalogItem } from '../catalog/api/types';
import { useCatalogTitle } from '../catalog/api/useCatalog';
import { useTranslation } from '../../i18n/useTranslation';
import { getCatalogTitlePath, type CatalogTitleKind } from '../../routes/paths';
import type { Bookmark } from './bookmarks';
import { useBookmarks } from './useBookmarks';

const getKey = (bookmark: Bookmark) => `${bookmark.kind}-${bookmark.tmdbId}`;

/** A title put aside: whether it is in the library, and Download when it is not. */
const BookmarkCard: FC<{ bookmark: Bookmark, onSelect: (bookmark: Bookmark) => void, onDismiss: (bookmark: Bookmark) => void }> = ({ bookmark, onSelect, onDismiss }) => {
    const t = useTranslation();
    const title = useCatalogTitle(bookmark.kind, bookmark.tmdbId);
    const availability = title.data?.Availability;
    const item = useMemo<CatalogItem>(() => ({
        Key: getKey(bookmark),
        Kind: bookmark.kind,
        Title: bookmark.title,
        TmdbId: bookmark.tmdbId,
        Availability: availability ?? CatalogAvailability.OnDisk
    }), [ availability, bookmark ]);

    return (
        <PosterCard
            title={bookmark.title}
            subtitle={bookmark.year ? String(bookmark.year) : undefined}
            imageUrl={bookmark.posterUrl ?? undefined}
            shape='portrait'
            badge={availability === CatalogAvailability.OnDisk ? { label: t('InYourLibrary') } : undefined}
            value={bookmark}
            onSelect={onSelect}
            onDismiss={onDismiss}
            dismissLabel={t('ActionRemoveBookmark')}
            overlay={availability ? <CardQuickActions item={item} withBookmark={false} /> : undefined}
        />
    );
};

/** The titles the user put aside, the last one first; only films or series when the screen is about one of them. */
const BookmarksRow: FC<{ kind?: CatalogTitleKind }> = ({ kind }) => {
    const t = useTranslation();
    const navigate = useNavigate();
    const { bookmarks, toggle } = useBookmarks();
    const shown = useMemo(() => (kind ? bookmarks.filter(bookmark => bookmark.kind === kind) : bookmarks), [ bookmarks, kind ]);

    // A bookmark opens the sheet of its title, which is the library one once it is on disk
    const open = useCallback((bookmark: Bookmark) => navigate(getCatalogTitlePath(bookmark.kind, bookmark.tmdbId)), [ navigate ]);

    const renderItem = useCallback((bookmark: Bookmark) => (
        <BookmarkCard bookmark={bookmark} onSelect={open} onDismiss={toggle} />
    ), [ open, toggle ]);

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
