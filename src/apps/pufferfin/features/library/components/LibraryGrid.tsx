import type { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import ExpandMore from '@mui/icons-material/ExpandMore';
import React, { type FC, useCallback, useEffect, useMemo, useRef } from 'react';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import PosterCard from '../../../components/PosterCard';
import RoundButton from '../../../components/RoundButton';
import type { StringKey } from '../../../i18n/translate';
import { useTranslation } from '../../../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE, focusElement } from '../../../navigation/focus';
import { getCardImageUrl } from '../../../utils/images';
import { getDisplayTitle, getEpisodeNumbers, getPlayedPercentage } from '../../../utils/items';
import { useOpenItem } from '../../../utils/navigation';
import { playAudiobook } from '../../../utils/playback';
import { isAudiobookEntry } from '../utils/library';
import { type LibraryItemsFilter, useLibraryItems } from '../api/useLibraryItems';

interface LibraryGridProps {
    parentId: string | undefined
    itemTypes: BaseItemKind[] | null
    filter?: LibraryItemsFilter
    /** Said when the grid comes back empty. */
    emptyKey: StringKey
}

/**
 * Titles of a library in a compact grid, a page at a time. After Show more,
 * the focus goes to the first new title: the button may be gone, and the
 * focus must not be lost.
 */
const LibraryGrid: FC<LibraryGridProps> = ({ parentId, itemTypes, filter, emptyKey }) => {
    const t = useTranslation();
    const { api, user } = useApi();
    const openItem = useOpenItem();
    // A book plays from where the user stopped; the rest opens its page
    const onSelect = useCallback((item: ItemDto) => {
        if (isAudiobookEntry(item)) {
            if (api && user?.Id) void playAudiobook(api, user.Id, item);
        } else {
            openItem(item);
        }
    }, [ api, openItem, user?.Id ]);
    const gridRef = useRef<HTMLUListElement>(null);

    const {
        data,
        isPending,
        isError,
        hasNextPage,
        isFetchingNextPage,
        isFetchNextPageError,
        fetchNextPage
    } = useLibraryItems(parentId, itemTypes, filter);
    const items = useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [ data ]);

    // The query is kept with the index, so a page that lands after a filter change does not pull the focus
    const queryKey = JSON.stringify([ parentId, itemTypes, filter ]);
    const pendingFocus = useRef<{ queryKey: string, index: number }>();
    const onShowMore = useCallback(() => {
        // Not disabled while loading: a disabled button would drop the focus
        if (isFetchingNextPage) return;
        pendingFocus.current = { queryKey, index: items.length };
        fetchNextPage().catch(() => undefined);
    }, [ fetchNextPage, isFetchingNextPage, items.length, queryKey ]);

    useEffect(() => {
        const pending = pendingFocus.current;
        if (!pending) return;
        if (pending.queryKey !== queryKey) {
            pendingFocus.current = undefined;
            return;
        }
        if (items.length <= pending.index) return;
        pendingFocus.current = undefined;
        const target = gridRef.current?.querySelectorAll<HTMLElement>(`[${FOCUSABLE_ATTRIBUTE}]`)[pending.index];
        if (target) focusElement(target);
    }, [ items.length, queryKey ]);

    const getSubtitle = (item: ItemDto) => {
        if (isAudiobookEntry(item) && item.AlbumArtist) return item.AlbumArtist;
        const numbers = getEpisodeNumbers(item);
        if (numbers) return t('EpisodeNumber', numbers[0], numbers[1]);
        return item.ProductionYear ? String(item.ProductionYear) : undefined;
    };

    if (isError) {
        // Failure is told with an icon and words, never with color alone
        return (
            <p className='pf-row__error' role='status'>
                <ErrorOutline aria-hidden='true' />
                {t('LibraryLoadError')}
            </p>
        );
    }
    if (isPending) return <p className='pf-library__note' aria-busy='true'>{t('Loading')}</p>;
    if (!items.length) return <p className='pf-library__note'>{t(emptyKey)}</p>;

    return (
        <>
            <ul ref={gridRef} className='pf-grid' aria-busy={isFetchingNextPage}>
                {items.map(item => {
                    const progress = getPlayedPercentage(item);
                    const progressKey = isAudiobookEntry(item) ? 'ListenedPercent' : 'WatchedPercent';
                    return (
                        <li key={item.Id ?? ''} className='pf-grid__item'>
                            <PosterCard
                                title={item.SeriesName && getEpisodeNumbers(item) ? item.SeriesName : getDisplayTitle(item)}
                                subtitle={getSubtitle(item)}
                                imageUrl={api ? getCardImageUrl(api, item, 'portrait') : undefined}
                                shape='portrait'
                                progress={progress}
                                progressLabel={progress ? t(progressKey, progress) : undefined}
                                value={item}
                                onSelect={onSelect}
                            />
                        </li>
                    );
                })}
            </ul>
            {isFetchNextPageError && (
                <p className='pf-row__error' role='status'>
                    <ErrorOutline aria-hidden='true' />
                    {t('LibraryLoadError')}
                </p>
            )}
            {hasNextPage && (
                <div className='pf-library__more'>
                    <RoundButton
                        icon={<ExpandMore />}
                        label={isFetchingNextPage ? t('Loading') : t('ActionShowMore')}
                        onClick={onShowMore}
                    />
                </div>
            )}
        </>
    );
};

export default LibraryGrid;
