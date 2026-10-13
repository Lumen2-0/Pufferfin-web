import React, { type FC, useMemo } from 'react';

import globalize from 'lib/globalize';

import CatalogCard from '../../../components/CatalogCard';
import MediaRow from '../../../components/MediaRow';
import { useTranslation } from '../../../i18n/useTranslation';
import { type CatalogItem, CatalogItemKind } from '../../catalog/api/types';
import { useTrending } from '../../catalog/api/useCatalog';
import { useVisibleCatalogItems } from '../../preferences/useVisibleCatalogItems';
import { getMonthPhrase, selectTopTen } from '../utils/topTen';

interface RankedItem {
    rank: number
    item: CatalogItem
}

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

/**
 * The ten films or series most watched right now (TMDB trending), ranked with
 * large numerals. The films open Discover with the month in their title.
 */
const TopTenRow: FC<{ kind: CatalogItemKind.Movie | CatalogItemKind.Series }> = ({ kind }) => {
    const t = useTranslation();
    const visible = useVisibleCatalogItems();
    const trending = useTrending(kind);

    const ranked = useMemo(
        () => selectTopTen(visible(trending.data)).map((item, index) => ({ rank: index + 1, item })),
        [ trending.data, visible ]
    );
    const title = kind === CatalogItemKind.Movie ?
        t('RowTopMoviesOfMonth', getMonthPhrase(globalize.getCurrentLocale(), new Date())) :
        t('RowTopShowsOfWeek');

    return (
        <div className='pf-top10-row'>
            <MediaRow
                title={title}
                shape='portrait'
                items={ranked}
                isPending={trending.isPending}
                isError={trending.isError}
                getKey={getKey}
                renderItem={renderRanked}
            />
        </div>
    );
};

export default TopTenRow;
