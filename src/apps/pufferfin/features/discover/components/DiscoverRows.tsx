import type { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import React, { type FC, useCallback, useMemo } from 'react';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import CatalogCard from '../../../components/CatalogCard';
import MediaRow from '../../../components/MediaRow';
import PosterCard from '../../../components/PosterCard';
import type { StringKey } from '../../../i18n/translate';
import { useTranslation } from '../../../i18n/useTranslation';
import { getCardImageUrl } from '../../../utils/images';
import { getDisplayTitle } from '../../../utils/items';
import { useOpenItem } from '../../../utils/navigation';
import { isPlayableItem } from '../../../utils/playback';
import { usePlayItem } from '../../../utils/usePlay';
import { type CatalogItem, CatalogItemKind } from '../../catalog/api/types';
import { useCatalogDiscover, useCatalogTitle, useRecommendedForYou } from '../../catalog/api/useCatalog';
import { useLatestItems } from '../../home/api/useHomeRows';
import { useVisibleCatalogItems } from '../../preferences/useVisibleCatalogItems';
import { type LastWatched, useLastWatched } from '../api/useLastWatched';

type TitleKind = CatalogItemKind.Movie | CatalogItemKind.Series;

const getCatalogKey = (item: CatalogItem) => item.Key;
const renderCatalogCard = (item: CatalogItem) => <CatalogCard item={item} />;
const getItemKey = (item: ItemDto) => item.Id ?? '';

/** Titles TMDB suggests from the last film or series watched. */
const RecommendationsOf: FC<{ watched: LastWatched }> = ({ watched }) => {
    const t = useTranslation();
    const visible = useVisibleCatalogItems();
    const title = useCatalogTitle(watched.kind, watched.tmdbId);
    return (
        <MediaRow
            title={t('RowBecauseYouWatched', watched.title)}
            shape='portrait'
            items={visible(title.data?.Recommendations)}
            isPending={title.isPending}
            isError={title.isError}
            getKey={getCatalogKey}
            renderItem={renderCatalogCard}
        />
    );
};

/**
 * Suggestions for the user: what TMDB recommends from the last film and the
 * last series watched, mixed with the picks from the Letterboxd diary.
 */
export const SuggestionsRow: FC = () => {
    const t = useTranslation();
    const visible = useVisibleCatalogItems();
    const lastMovie = useLastWatched([ CatalogItemKind.Movie ]).data;
    const lastSeries = useLastWatched([ CatalogItemKind.Series ]).data;
    const movie = useCatalogTitle(CatalogItemKind.Movie, lastMovie?.tmdbId ?? 0, !!lastMovie);
    const series = useCatalogTitle(CatalogItemKind.Series, lastSeries?.tmdbId ?? 0, !!lastSeries);
    const forYou = useRecommendedForYou();

    const items = useMemo(() => {
        const lists = [ movie.data?.Recommendations, series.data?.Recommendations, forYou.data ];
        const keys = new Set<string>();
        const mixed: CatalogItem[] = [];
        const longest = Math.max(0, ...lists.map(list => list?.length ?? 0));
        for (let index = 0; index < longest; index++) {
            for (const list of lists) {
                const item = list?.[index];
                if (item && !keys.has(item.Key)) {
                    keys.add(item.Key);
                    mixed.push(item);
                }
            }
        }
        return mixed;
    }, [ movie.data, series.data, forYou.data ]);

    return (
        <MediaRow
            title={t('RowRecommendedForYou')}
            shape='portrait'
            items={visible(items)}
            isPending={forYou.isPending || movie.isPending && !!lastMovie || series.isPending && !!lastSeries}
            isError={false}
            getKey={getCatalogKey}
            renderItem={renderCatalogCard}
        />
    );
};

/** "Because you watched X": nothing at all until something was watched. */
export const BecauseYouWatchedRow: FC<{ kinds: TitleKind[] }> = ({ kinds }) => {
    const watched = useLastWatched(kinds);
    if (!watched.data) return null;
    return <RecommendationsOf watched={watched.data} />;
};

/** The titles last added to the server, the newest first. */
export const LatestRow: FC<{ itemTypes?: BaseItemKind[] }> = ({ itemTypes }) => {
    const t = useTranslation();
    const { api } = useApi();
    const openItem = useOpenItem();
    const playItem = usePlayItem();
    const latest = useLatestItems(itemTypes);

    const renderItem = useCallback((item: ItemDto) => (
        <PosterCard
            title={getDisplayTitle(item)}
            subtitle={item.ProductionYear ? String(item.ProductionYear) : undefined}
            imageUrl={api ? getCardImageUrl(api, item, 'portrait') : undefined}
            shape='portrait'
            value={item}
            onSelect={openItem}
            onPlay={isPlayableItem(item) ? playItem : undefined}
        />
    ), [ api, openItem, playItem ]);

    return (
        <MediaRow
            title={t('RowNewOnServer')}
            shape='portrait'
            items={latest.data}
            isPending={latest.isPending}
            isError={latest.isError}
            getKey={getItemKey}
            renderItem={renderItem}
        />
    );
};

const SORT_TITLES: Record<'Newest' | 'TopRated', Record<TitleKind, StringKey>> = {
    Newest: { [CatalogItemKind.Movie]: 'RowNewReleasesMovies', [CatalogItemKind.Series]: 'RowNewReleasesSeries' },
    TopRated: { [CatalogItemKind.Movie]: 'RowClassicsMovies', [CatalogItemKind.Series]: 'RowClassicsSeries' }
};

/** The latest releases ("Newest") or the best rated of all time ("TopRated"), on disk and missing mixed. */
export const SortedCatalogRow: FC<{ kind: TitleKind, sort: 'Newest' | 'TopRated' }> = ({ kind, sort }) => {
    const t = useTranslation();
    const visible = useVisibleCatalogItems();
    const filter = useMemo(() => ({ sort }), [ sort ]);
    const titles = useCatalogDiscover(kind, filter);
    return (
        <MediaRow
            title={t(SORT_TITLES[sort][kind])}
            shape='portrait'
            items={visible(titles.data)}
            isPending={titles.isPending}
            isError={titles.isError}
            getKey={getCatalogKey}
            renderItem={renderCatalogCard}
        />
    );
};
