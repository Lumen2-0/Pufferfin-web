import InfoOutlined from '@mui/icons-material/InfoOutlined';
import PlayArrow from '@mui/icons-material/PlayArrow';
import React, { useCallback, useRef } from 'react';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import CatalogCard from '../components/CatalogCard';
import Hero from '../components/Hero';
import MediaRow from '../components/MediaRow';
import PosterCard from '../components/PosterCard';
import RoundButton from '../components/RoundButton';
import { CatalogItemKind, type CatalogItem } from '../features/catalog/api/types';
import { useRecommendedForYou, useTrending } from '../features/catalog/api/useCatalog';
import { getOpenableItems } from '../features/catalog/utils/catalog';
import { useLatestItems, useNextUpItems, useResumeItems } from '../features/home/api/useHomeRows';
import { useTranslation } from '../i18n/useTranslation';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { type CardShape, getBackdropUrl, getCardImageUrl } from '../utils/images';
import { getDisplayTitle, getEpisodeNumbers, getPlayedPercentage, isResumable } from '../utils/items';
import { useOpenItem } from '../utils/navigation';
import { playItem } from '../utils/playback';

const getKey = (item: ItemDto) => item.Id ?? '';
const getCatalogKey = (item: CatalogItem) => item.Key;
const renderCatalogCard = (item: CatalogItem) => <CatalogCard item={item} />;

export const Component = () => {
    const t = useTranslation();
    const { api } = useApi();
    const openItem = useOpenItem();
    const pageRef = useRef<HTMLDivElement>(null);

    const resume = useResumeItems();
    const nextUp = useNextUpItems();
    const latest = useLatestItems();
    // Catalog rows mix titles on disk and missing ones; they are not needed to pick the featured title
    const forYou = useRecommendedForYou();
    const trendingMovies = useTrending(CatalogItemKind.Movie);
    const trendingShows = useTrending(CatalogItemKind.Series);

    const featured = resume.data?.[0] ?? latest.data?.[0];
    const isLoaded = !resume.isPending && !nextUp.isPending && !latest.isPending;
    const catalogRows = [ forYou, trendingMovies, trendingShows ];
    const isEmpty = isLoaded && !featured && !nextUp.data?.length
        && !resume.isError && !nextUp.isError && !latest.isError
        // The library may be empty while the catalog still has titles to offer
        && catalogRows.every(row => !row.isPending && !row.isError && !getOpenableItems(row.data)?.length);

    useInitialFocus(pageRef, [ featured, isLoaded ]);

    const getEpisodeLabel = useCallback((item: ItemDto) => {
        const numbers = getEpisodeNumbers(item);
        return numbers ? t('EpisodeNumber', numbers[0], numbers[1]) : undefined;
    }, [ t ]);

    const renderCard = useCallback((shape: CardShape) => {
        const CardRenderer = (item: ItemDto) => {
            const progress = getPlayedPercentage(item);
            return (
                <PosterCard
                    title={getDisplayTitle(item)}
                    subtitle={getEpisodeLabel(item)}
                    imageUrl={api ? getCardImageUrl(api, item, shape) : undefined}
                    shape={shape}
                    progress={progress}
                    progressLabel={progress ? t('WatchedPercent', progress) : undefined}
                    value={item}
                    onSelect={openItem}
                />
            );
        };
        return CardRenderer;
    }, [ api, getEpisodeLabel, openItem, t ]);

    return (
        <div ref={pageRef} className='pf-home'>
            {featured && (
                <Hero
                    title={getDisplayTitle(featured)}
                    eyebrow={getEpisodeLabel(featured)}
                    overview={featured.Overview}
                    backdropUrl={api ? getBackdropUrl(api, featured) : undefined}
                    actions={
                        <>
                            <RoundButton
                                variant='primary'
                                icon={<PlayArrow />}
                                label={isResumable(featured) ? t('ActionResume') : t('ActionPlay')}
                                value={featured}
                                onClick={playItem}
                            />
                            <RoundButton
                                icon={<InfoOutlined />}
                                label={t('ActionMoreInfo')}
                                value={featured}
                                onClick={openItem}
                            />
                        </>
                    }
                />
            )}

            <div className='pf-home__rows'>
                <MediaRow
                    title={t('RowContinueWatching')}
                    shape='landscape'
                    items={resume.data}
                    isPending={resume.isPending}
                    isError={resume.isError}
                    getKey={getKey}
                    renderItem={renderCard('landscape')}
                />
                <MediaRow
                    title={t('RowNextUp')}
                    shape='landscape'
                    items={nextUp.data}
                    isPending={nextUp.isPending}
                    isError={nextUp.isError}
                    getKey={getKey}
                    renderItem={renderCard('landscape')}
                />
                <MediaRow
                    title={t('RowRecommendedForYou')}
                    shape='portrait'
                    items={getOpenableItems(forYou.data)}
                    isPending={forYou.isPending}
                    isError={forYou.isError}
                    getKey={getCatalogKey}
                    renderItem={renderCatalogCard}
                />
                <MediaRow
                    title={t('RowTrendingMovies')}
                    shape='portrait'
                    items={getOpenableItems(trendingMovies.data)}
                    isPending={trendingMovies.isPending}
                    isError={trendingMovies.isError}
                    getKey={getCatalogKey}
                    renderItem={renderCatalogCard}
                />
                <MediaRow
                    title={t('RowTrendingShows')}
                    shape='portrait'
                    items={getOpenableItems(trendingShows.data)}
                    isPending={trendingShows.isPending}
                    isError={trendingShows.isError}
                    getKey={getCatalogKey}
                    renderItem={renderCatalogCard}
                />
                <MediaRow
                    title={t('RowRecentlyAdded')}
                    shape='portrait'
                    items={latest.data}
                    isPending={latest.isPending}
                    isError={latest.isError}
                    getKey={getKey}
                    renderItem={renderCard('portrait')}
                />

                {isEmpty && <p className='pf-home__empty'>{t('HomeEmpty')}</p>}
            </div>
        </div>
    );
};

Component.displayName = 'PufferfinHomePage';
