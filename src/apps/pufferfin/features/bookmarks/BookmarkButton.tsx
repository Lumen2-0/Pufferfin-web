import React, { type FC, useCallback } from 'react';

import RoundButton from '../../components/RoundButton';
import { Bookmark as BookmarkIcon, BookmarkFilled } from '../../components/icons';
import { ListIcon } from '../details/components/sheetIcons';
import { useTranslation } from '../../i18n/useTranslation';
import type { Bookmark } from './bookmarks';
import { useBookmarks } from './useBookmarks';

/**
 * The bookmark of a sheet: puts the title aside to watch later, or takes it
 * out. A round icon, or "My list" with its label among the actions of a title.
 */
const BookmarkButton: FC<{ bookmark: Bookmark, withLabel?: boolean }> = ({ bookmark, withLabel }) => {
    const t = useTranslation();
    const { toggle, isBookmarked } = useBookmarks();
    const isOn = isBookmarked(bookmark.kind, bookmark.tmdbId);
    const onClick = useCallback(() => toggle(bookmark), [ bookmark, toggle ]);

    if (withLabel) {
        return (
            <RoundButton
                icon={<ListIcon filled={isOn} />}
                label={t('ActionMyList')}
                pressed={isOn}
                onClick={onClick}
            />
        );
    }

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
