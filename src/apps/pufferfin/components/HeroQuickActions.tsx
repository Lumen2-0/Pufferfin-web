import React, { type FC, useCallback, useMemo } from 'react';

import { useBookmarks } from '../features/bookmarks/useBookmarks';
import { type CatalogItem, CatalogItemKind } from '../features/catalog/api/types';
import { useQuickDownload } from '../features/requests/useQuickDownload';
import { useTranslation } from '../i18n/useTranslation';
import type { CatalogTitleKind } from '../routes/paths';
import { Bookmark, BookmarkFilled, Check, Download } from './icons';
import RoundButton from './RoundButton';

/** On a large card: the wishlist of the title, and Download when it is missing from the library. */
const HeroQuickActions: FC<{ item: CatalogItem }> = ({ item }) => {
    const t = useTranslation();
    const quick = useQuickDownload(item);
    const { toggle, isBookmarked } = useBookmarks();
    const kind: CatalogTitleKind = item.Kind === CatalogItemKind.Series ? CatalogItemKind.Series : CatalogItemKind.Movie;
    const tmdbId = item.TmdbId ?? 0;
    const isOn = isBookmarked(kind, tmdbId);
    const bookmark = useMemo(() => ({
        kind,
        tmdbId,
        title: item.Title,
        year: item.Year,
        posterUrl: item.ImageUrl
    }), [ item, kind, tmdbId ]);
    const onBookmark = useCallback(() => toggle(bookmark), [ bookmark, toggle ]);
    const { download } = quick;
    const onDownload = useCallback(() => {
        void download();
    }, [ download ]);

    if (!tmdbId) return null;

    return (
        <>
            <RoundButton
                icon={isOn ? <BookmarkFilled /> : <Bookmark />}
                label={t(isOn ? 'HeroWishlistAdded' : 'HeroWishlistAdd')}
                pressed={isOn}
                onClick={onBookmark}
            />
            {quick.isAvailable && (
                <RoundButton
                    icon={quick.isRequested ? <Check /> : <Download />}
                    label={t(quick.isRequested ? 'ActionDownloadRequested' : 'ActionDownload')}
                    pressed={quick.isRequested}
                    disabled={quick.isRequested}
                    onClick={onDownload}
                />
            )}
        </>
    );
};

export default HeroQuickActions;
