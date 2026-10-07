import InfoOutlined from '@mui/icons-material/InfoOutlined';
import PlayArrow from '@mui/icons-material/PlayArrow';
import React, { type FC, type RefObject, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

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
import { useBookItems, useLiveTvOnNow, useRecordings } from '../features/discover/api/useDiscoverRows';
import TypePicker from '../features/discover/components/TypePicker';
import {
    DISCOVER_TYPE_LABELS,
    DISCOVER_TYPE_PARAM,
    DiscoverRow,
    DiscoverType,
    getDiscoverRows,
    getDiskItemTypes,
    hasFeatured,
    parseDiscoverType
} from '../features/discover/utils/discover';
import { useAudiobookItems, useLatestItems, useNextUpItems, useResumeItems } from '../features/home/api/useHomeRows';
import DownloadsRow from '../features/requests/components/DownloadsRow';
import { useTranslation } from '../i18n/useTranslation';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { type CardShape, getBackdropUrl, getCardImageUrl } from '../utils/images';
import { getDisplayTitle, getEpisodeNumbers, getPlayedPercentage, isResumable } from '../utils/items';
import { useOpenItem } from '../utils/navigation';
import { playItem } from '../utils/playback';

const getKey = (item: ItemDto) => item.Id ?? '';
const getCatalogKey = (item: CatalogItem) => item.Key;
const renderCatalogCard = (item: CatalogItem) => <CatalogCard item={item} />;

/** Card renderers shared by the library rows of every type. */
function useCardRenderers() {
    const t = useTranslation();
    const { api } = useApi();
    const openItem = useOpenItem();

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

    // A book plays from where the user stopped: the card is Listen
    const renderAudiobook = useCallback((item: ItemDto) => {
        const progress = getPlayedPercentage(item);
        return (
            <PosterCard
                title={getDisplayTitle(item)}
                subtitle={item.AlbumArtist ?? item.Artists?.[0] ?? undefined}
                imageUrl={api ? getCardImageUrl(api, item, 'portrait') : undefined}
                shape='portrait'
                progress={progress}
                progressLabel={progress ? t('ListenedPercent', progress) : undefined}
                value={item}
                onSelect={playItem}
            />
        );
    }, [ api, t ]);

    // A live program shows its channel under the title; it opens on its upstream page
    const renderProgram = useCallback((item: ItemDto) => (
        <PosterCard
            title={getDisplayTitle(item)}
            subtitle={item.ChannelName ?? undefined}
            imageUrl={api ? getCardImageUrl(api, item, 'landscape') : undefined}
            shape='landscape'
            value={item}
            onSelect={openItem}
        />
    ), [ api, openItem ]);

    return { getEpisodeLabel, renderCard, renderAudiobook, renderProgram };
}

interface RowProps {
    row: DiscoverRow
    type: DiscoverType
}

const ContinueWatchingRow: FC<RowProps> = ({ type }) => {
    const t = useTranslation();
    const { renderCard } = useCardRenderers();
    const resume = useResumeItems(getDiskItemTypes(type));
    return (
        <MediaRow
            title={t('RowContinueWatching')}
            shape='landscape'
            items={resume.data}
            isPending={resume.isPending}
            isError={resume.isError}
            getKey={getKey}
            renderItem={renderCard('landscape')}
        />
    );
};

const NextUpRow: FC = () => {
    const t = useTranslation();
    const { renderCard } = useCardRenderers();
    const nextUp = useNextUpItems();
    return (
        <MediaRow
            title={t('RowNextUp')}
            shape='landscape'
            items={nextUp.data}
            isPending={nextUp.isPending}
            isError={nextUp.isError}
            getKey={getKey}
            renderItem={renderCard('landscape')}
        />
    );
};

const RecommendedRow: FC = () => {
    const t = useTranslation();
    const forYou = useRecommendedForYou();
    return (
        <MediaRow
            title={t('RowRecommendedForYou')}
            shape='portrait'
            items={getOpenableItems(forYou.data)}
            isPending={forYou.isPending}
            isError={forYou.isError}
            getKey={getCatalogKey}
            renderItem={renderCatalogCard}
        />
    );
};

const TrendingRow: FC<{ kind: CatalogItemKind.Movie | CatalogItemKind.Series }> = ({ kind }) => {
    const t = useTranslation();
    const trending = useTrending(kind);
    return (
        <MediaRow
            title={t(kind === CatalogItemKind.Movie ? 'RowTrendingMovies' : 'RowTrendingShows')}
            shape='portrait'
            items={getOpenableItems(trending.data)}
            isPending={trending.isPending}
            isError={trending.isError}
            getKey={getCatalogKey}
            renderItem={renderCatalogCard}
        />
    );
};

const RecentlyAddedRow: FC<RowProps> = ({ type }) => {
    const t = useTranslation();
    const { renderCard, renderAudiobook } = useCardRenderers();
    const latest = useLatestItems(getDiskItemTypes(type));
    return (
        <MediaRow
            title={t('RowRecentlyAdded')}
            shape='portrait'
            items={latest.data}
            isPending={latest.isPending}
            isError={latest.isError}
            getKey={getKey}
            renderItem={type === DiscoverType.Audiobooks ? renderAudiobook : renderCard('portrait')}
        />
    );
};

const AudiobooksRow: FC = () => {
    const t = useTranslation();
    const { renderAudiobook } = useCardRenderers();
    const audiobooks = useAudiobookItems();
    return (
        <MediaRow
            title={t('RowAudiobooks')}
            shape='portrait'
            items={audiobooks.data}
            isPending={audiobooks.isPending}
            isError={audiobooks.isError}
            getKey={getKey}
            renderItem={renderAudiobook}
        />
    );
};

/** Live TV rows only exist for a user allowed to watch live TV: no row, rather than a row in error. */
const useHasLiveTvAccess = () => {
    const { user } = useApi();
    return !!user?.Policy?.EnableLiveTvAccess;
};

const LiveTvOnNowRow: FC = () => {
    const t = useTranslation();
    const { renderProgram } = useCardRenderers();
    const programs = useLiveTvOnNow();
    if (!useHasLiveTvAccess()) return null;
    return (
        <MediaRow
            title={t('RowLiveTvOnNow')}
            shape='landscape'
            items={programs.data}
            isPending={programs.isPending}
            isError={programs.isError}
            getKey={getKey}
            renderItem={renderProgram}
        />
    );
};

const RecordingsRow: FC = () => {
    const t = useTranslation();
    const { renderCard } = useCardRenderers();
    const recordings = useRecordings();
    if (!useHasLiveTvAccess()) return null;
    return (
        <MediaRow
            title={t('RowRecordings')}
            shape='landscape'
            items={recordings.data}
            isPending={recordings.isPending}
            isError={recordings.isError}
            getKey={getKey}
            renderItem={renderCard('landscape')}
        />
    );
};

const BooksRow: FC = () => {
    const t = useTranslation();
    const { renderCard } = useCardRenderers();
    const books = useBookItems();
    return (
        <MediaRow
            title={t('RowBooks')}
            shape='portrait'
            items={books.data}
            isPending={books.isPending}
            isError={books.isError}
            getKey={getKey}
            renderItem={renderCard('portrait')}
        />
    );
};

/** One row of a Discover screen; each fetches its own data, only when it is shown. */
const DiscoverRowView: FC<RowProps> = ({ row, type }) => {
    switch (row) {
        case DiscoverRow.ContinueWatching:
            return <ContinueWatchingRow row={row} type={type} />;
        case DiscoverRow.NextUp:
            return <NextUpRow />;
        case DiscoverRow.RecommendedForYou:
            return <RecommendedRow />;
        case DiscoverRow.TrendingMovies:
            return <TrendingRow kind={CatalogItemKind.Movie} />;
        case DiscoverRow.TrendingShows:
            return <TrendingRow kind={CatalogItemKind.Series} />;
        case DiscoverRow.RecentlyAdded:
            return <RecentlyAddedRow row={row} type={type} />;
        case DiscoverRow.Downloads:
            return <DownloadsRow />;
        case DiscoverRow.Audiobooks:
            return <AudiobooksRow />;
        case DiscoverRow.LiveTvOnNow:
            return <LiveTvOnNowRow />;
        case DiscoverRow.Recordings:
            return <RecordingsRow />;
        case DiscoverRow.Books:
            return <BooksRow />;
    }
};

/** Featured title of the video types: the next thing to resume, or the newest title of the type. */
const Featured: FC<{ type: DiscoverType, pageRef: RefObject<HTMLDivElement> }> = ({ type, pageRef }) => {
    const t = useTranslation();
    const { api } = useApi();
    const openItem = useOpenItem();
    const { getEpisodeLabel } = useCardRenderers();
    const itemTypes = getDiskItemTypes(type);
    const resume = useResumeItems(itemTypes);
    const latest = useLatestItems(itemTypes);

    const featured = resume.data?.[0] ?? latest.data?.[0];
    const isLoaded = !resume.isPending && !latest.isPending;

    // The focus starts on Play once the featured title is known, not on the picker above it
    useInitialFocus(pageRef, [ featured, isLoaded ], isLoaded);

    if (!featured) return null;

    return (
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
    );
};

/**
 * Discover: the whole catalog, what is on disk and what TMDB and Audible
 * offer, mixed without rank. The type picker reconfigures the screen; the
 * type lives in the address, so Back returns to the same screen.
 */
export const Component = () => {
    const t = useTranslation();
    const pageRef = useRef<HTMLDivElement>(null);
    const [ searchParams, setSearchParams ] = useSearchParams();
    const type = parseDiscoverType(searchParams.get(DISCOVER_TYPE_PARAM));
    const withFeatured = hasFeatured(type);

    const onTypeChange = useCallback((next: DiscoverType) => {
        setSearchParams(next === DiscoverType.All ? {} : { [DISCOVER_TYPE_PARAM]: next }, { replace: true });
    }, [ setSearchParams ]);

    // Without a featured title, the picker is the starting point
    useInitialFocus(pageRef, [ type ], !withFeatured);

    return (
        <div ref={pageRef} className='pf-home pf-discover'>
            {/* The page title for assistive technologies; the picker says which type is shown */}
            {!withFeatured && <h1 className='pf-visually-hidden'>{t('DiscoverTitle', t(DISCOVER_TYPE_LABELS[type]))}</h1>}
            {withFeatured && <Featured key={type} type={type} pageRef={pageRef} />}

            {/* After the featured title in the reading order, over its art on screen */}
            <div className='pf-discover__header'>
                <TypePicker value={type} onChange={onTypeChange} />
            </div>

            <div className='pf-home__rows pf-discover__rows'>
                {getDiscoverRows(type).map(row => <DiscoverRowView key={`${type}-${row}`} row={row} type={type} />)}
            </div>
            {/* Shown by the style sheet only when every row above came back empty */}
            <p className='pf-home__empty pf-discover__empty'>{t('DiscoverEmpty')}</p>
        </div>
    );
};

Component.displayName = 'PufferfinDiscoverPage';
