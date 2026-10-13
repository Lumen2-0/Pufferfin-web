import React, { type FC, useEffect, useRef, useState } from 'react';

import CatalogCard from '../../../components/CatalogCard';
import MediaRow from '../../../components/MediaRow';
import { useTranslation } from '../../../i18n/useTranslation';
import type { CatalogItem } from '../../catalog/api/types';
import { useCatalogDiscover, usePopularAudiobooks } from '../../catalog/api/useCatalog';
import { useVisibleCatalogItems } from '../../preferences/useVisibleCatalogItems';
import type { AudiobookThemeRow, ThemeRow, TitleThemeRow } from '../utils/themes';

const getKey = (item: CatalogItem) => item.Key;
const renderCard = (item: CatalogItem) => <CatalogCard item={item} />;

/** How far below the screen a row starts loading, so it is ready when scrolled to. */
const PRELOAD_MARGIN = '600px 0px';

/** Whether an element is near the screen; once it was, it stays true. */
function useIsNear() {
    const ref = useRef<HTMLDivElement>(null);
    const [ isNear, setIsNear ] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element || isNear) return;
        if (typeof IntersectionObserver === 'undefined') {
            setIsNear(true);
            return;
        }
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) setIsNear(true);
        }, { rootMargin: PRELOAD_MARGIN });
        observer.observe(element);
        return () => observer.disconnect();
    }, [ isNear ]);

    return { ref, isNear };
}

interface RowProps<T extends ThemeRow> {
    row: T
    isEnabled: boolean
    brand?: string
}

const TitleRow: FC<RowProps<TitleThemeRow>> = ({ row, isEnabled, brand }) => {
    const t = useTranslation();
    const visible = useVisibleCatalogItems();
    const titles = useCatalogDiscover(row.kind, { ...row, brand }, isEnabled);
    return (
        <MediaRow
            title={row.title(t)}
            shape='portrait'
            items={visible(titles.data)}
            isPending={titles.isPending}
            isError={titles.isError}
            getKey={getKey}
            renderItem={renderCard}
        />
    );
};

const AudiobookRow: FC<RowProps<AudiobookThemeRow>> = ({ row, isEnabled }) => {
    const t = useTranslation();
    const visible = useVisibleCatalogItems();
    const audiobooks = usePopularAudiobooks(row.sort, row.theme, isEnabled);
    return (
        <MediaRow
            title={row.title(t)}
            shape='portrait'
            items={visible(audiobooks.data)}
            isPending={audiobooks.isPending}
            isError={audiobooks.isError}
            getKey={getKey}
            renderItem={renderCard}
        />
    );
};

const ThemeRowBody: FC<{ row: ThemeRow, isEnabled: boolean, brand?: string }> = ({ row, isEnabled, brand }) => (
    row.source === 'audible' ?
        <AudiobookRow row={row} isEnabled={isEnabled} /> :
        <TitleRow row={row} isEnabled={isEnabled} brand={brand} />
);

/**
 * A genre row of the Discover screen ("Best Horror Movies", "Top Drama Series of
 * 2026", "Best Crime Audiobooks"), within one brand (a streaming service, a studio, a network) when one is chosen. It reads its titles only once it nears the screen: a screen of
 * twenty rows does not send twenty requests at once.
 */
const ThemeRowView: FC<{ row: ThemeRow, brand?: string }> = ({ row, brand }) => {
    const { ref, isNear } = useIsNear();
    return (
        <div ref={ref} className='pf-theme-row'>
            <ThemeRowBody row={row} isEnabled={isNear} brand={brand} />
        </div>
    );
};

export default ThemeRowView;
