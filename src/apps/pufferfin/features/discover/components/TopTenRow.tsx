import React, { type FC, useMemo } from 'react';

import CatalogCard from '../../../components/CatalogCard';
import MediaRow from '../../../components/MediaRow';
import { useTranslation } from '../../../i18n/useTranslation';
import { type CatalogItem, CatalogItemKind } from '../../catalog/api/types';
import { useCatalogDiscover, useTrending } from '../../catalog/api/useCatalog';
import { useVisibleCatalogItems } from '../../preferences/useVisibleCatalogItems';
import { selectTopTen } from '../utils/topTen';

interface RankedItem {
    rank: number
    item: CatalogItem
}

export type TopPeriod = 'week' | 'month' | 'year';

type TopKind = CatalogItemKind.Movie | CatalogItemKind.Series;

const getKey = (entry: RankedItem) => entry.item.Key;

// The rank is drawn beside the poster, the poster overlapping its end, as a top 10 reads
const renderRanked = ({ rank, item }: RankedItem) => (
    <span className='pf-top10'>
        <span className='pf-top10__rank' aria-hidden='true'>{rank}</span>
        <span className='pf-top10__card'>
            <CatalogCard item={item} />
        </span>
    </span>
);

const TITLES = {
    [CatalogItemKind.Movie]: { week: 'RowTopMoviesWeek', month: 'RowTopMoviesMonth', year: 'RowTopMoviesYear' },
    [CatalogItemKind.Series]: { week: 'RowTopShowsWeek', month: 'RowTopShowsMonth', year: 'RowTopShowsYear' }
} as const;

/** Merges ranked lists: a title high in several of them (watched now and liked this month) comes first. */
function fuse(lists: CatalogItem[][]): CatalogItem[] {
    const scores = new Map<string, { item: CatalogItem, score: number }>();
    for (const list of lists) {
        list.forEach((item, index) => {
            const entry = scores.get(item.Key) ?? { item, score: 0 };
            entry.score += 1 / (10 + index);
            scores.set(item.Key, entry);
        });
    }
    return [ ...scores.values() ].sort((a, b) => b.score - a.score).map(entry => entry.item);
}

const toDate = (date: Date) => date.toISOString().slice(0, 10);

/**
 * The ten films or series of the current week (TMDB trending), month (what is
 * trending now, crossed with the most popular and best liked of the last 60
 * days) or year (the most popular of the year),
 * ranked with large numerals.
 */
const TopTenRow: FC<{ kind: TopKind, period: TopPeriod }> = ({ kind, period }) => {
    const t = useTranslation();
    const visible = useVisibleCatalogItems();
    const trending = useTrending(kind, period !== 'year');
    const filter = useMemo(() => {
        const now = new Date();
        if (period === 'year') return { year: now.getFullYear() };
        return { since: toDate(new Date(now.getTime() - 60 * 24 * 3600 * 1000)) };
    }, [ period ]);
    const discover = useCatalogDiscover(kind, filter, period !== 'week');
    const source = period === 'week' ? trending : discover;

    const ranked = useMemo(() => {
        const items = period === 'month' ? fuse([ trending.data ?? [], discover.data ?? [] ]) : source.data;
        return selectTopTen(visible(items), period === 'month' ? 20 : undefined).map((item, index) => ({ rank: index + 1, item }));
    }, [ period, trending.data, discover.data, source.data, visible ]);

    return (
        <div className='pf-top10-row'>
            <MediaRow
                title={t(TITLES[kind][period])}
                shape='portrait'
                items={ranked}
                isPending={source.isPending}
                isError={source.isError}
                getKey={getKey}
                renderItem={renderRanked}
            />
        </div>
    );
};

export default TopTenRow;
