import React, { type FC, useCallback, useMemo } from 'react';

import { type CatalogItem, CatalogItemKind } from '../features/catalog/api/types';
import { useBookmarks } from '../features/bookmarks/useBookmarks';
import { useQuickDownload } from '../features/requests/useQuickDownload';
import { useTranslation } from '../i18n/useTranslation';
import type { CatalogTitleKind } from '../routes/paths';
import { Bookmark, BookmarkFilled, Check, Download } from './icons';

/**
 * Under the pointer on a poster: a bookmark at the top right, and Download at
 * the bottom left for a title missing from the library. Both sit in the zone
 * of the card, beside its button, and are not focus stops: the sheet has them too.
 */
const CardQuickActions: FC<{ item: CatalogItem, withBookmark?: boolean }> = ({ item, withBookmark = true }) => {
    const t = useTranslation();
    const { toggle, isBookmarked } = useBookmarks();
    const quick = useQuickDownload(item);
    const kind: CatalogTitleKind = item.Kind === CatalogItemKind.Series ? CatalogItemKind.Series : CatalogItemKind.Movie;
    const isTitle = item.Kind === CatalogItemKind.Movie || item.Kind === CatalogItemKind.Series;
    const tmdbId = item.TmdbId ?? 0;
    const isOn = isBookmarked(kind, tmdbId);
    const bookmark = useMemo(() => ({
        kind,
        tmdbId,
        title: item.Title,
        year: item.Year,
        posterUrl: item.ImageUrl
    }), [ item.ImageUrl, item.Title, item.Year, kind, tmdbId ]);
    const onBookmark = useCallback(() => toggle(bookmark), [ bookmark, toggle ]);
    const { download } = quick;
    const onDownload = useCallback(() => {
        void download();
    }, [ download ]);

    if (!isTitle || !tmdbId) return null;

    return (
        <>
            {withBookmark && (
                <button
                    type='button'
                    className='pf-card-play__bookmark'
                    aria-label={`${t(isOn ? 'ActionRemoveBookmark' : 'ActionBookmark')}, ${item.Title}`}
                    aria-pressed={isOn}
                    title={t(isOn ? 'ActionRemoveBookmark' : 'ActionBookmark')}
                    onClick={onBookmark}
                    tabIndex={-1}
                >
                    {isOn ? <BookmarkFilled fontSize='inherit' aria-hidden='true' /> : <Bookmark fontSize='inherit' aria-hidden='true' />}
                </button>
            )}
            {quick.isAvailable && (
                <button
                    type='button'
                    className='pf-card-play__download'
                    aria-label={`${t(quick.isRequested ? 'ActionDownloadRequested' : 'ActionDownload')}, ${item.Title}`}
                    title={t(quick.isRequested ? 'ActionDownloadRequested' : 'ActionDownload')}
                    onClick={onDownload}
                    disabled={quick.isRequested}
                    tabIndex={-1}
                >
                    {quick.isRequested ? <Check fontSize='inherit' aria-hidden='true' /> : <Download fontSize='inherit' aria-hidden='true' />}
                </button>
            )}
        </>
    );
};

export default CardQuickActions;
