import React, { type FC, useCallback } from 'react';

import RoundButton from '../../components/RoundButton';
import { Bookmark as BookmarkIcon, BookmarkFilled } from '../../components/icons';
import { useTranslation } from '../../i18n/useTranslation';
import type { Bookmark } from './bookmarks';
import { useBookmarks } from './useBookmarks';

/** The small bookmark of a sheet: puts the title aside to watch later, or takes it out. */
const BookmarkButton: FC<{ bookmark: Bookmark }> = ({ bookmark }) => {
    const t = useTranslation();
    const { toggle, isBookmarked } = useBookmarks();
    const isOn = isBookmarked(bookmark.kind, bookmark.tmdbId);
    const onClick = useCallback(() => toggle(bookmark), [ bookmark, toggle ]);

    return (
        <RoundButton
            icon={isOn ? <BookmarkFilled /> : <BookmarkIcon />}
            ariaLabel={t(isOn ? 'ActionRemoveBookmark' : 'ActionBookmark')}
            pressed={isOn}
            onClick={onClick}
        />
    );
};

export default BookmarkButton;
