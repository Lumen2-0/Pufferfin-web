import InfoOutlined from '@mui/icons-material/InfoOutlined';
import PlayArrow from '@mui/icons-material/PlayArrow';
import classNames from 'classnames';
import React, { type FC, type RefObject, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import CatalogCard from '../components/CatalogCard';
import Hero from '../components/Hero';
import MediaRow from '../components/MediaRow';
import PosterCard from '../components/PosterCard';
import RoundButton from '../components/RoundButton';
import { CatalogItemKind, type CatalogItem } from '../features/catalog/api/types';
import {
    type AudiobookPopularSort,
    type CatalogDiscoverFilter,
    useCatalogDiscover,
    usePopularAudiobooks,
    useRecommendedForYou,
    useTrending,
    useTrendingBooks
} from '../features/catalog/api/useCatalog';
import { getCatalogItemPath, getOpenableItems } from '../features/catalog/utils/catalog';
import { useLiveTvOnNow, useRecordings } from '../features/discover/api/useDiscoverRows';
import TypePicker from '../features/discover/components/TypePicker';
import {
    DISCOVER_TYPE_LABELS,
    DISCOVER_TYPE_PARAM,
    DiscoverRow,
    DiscoverType,
    DOCUMENTARY_GENRE_ID,
    getDiscoverRows,
    getDiskItemTypes,
    hasFeatured,
    parseDiscoverType,
    TV_SHOW_TYPES
} from '../features/discover/utils/discover';
import { useNextUpItems, useResumeItems } from '../features/home/api/useHomeRows';
import DownloadsRow from '../features/requests/components/DownloadsRow';
import type { StringKey } from '../i18n/translate';
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

    return { getEpisodeLabel, renderCard, renderProgram };
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

interface CatalogDiscoverRowProps {
    title: StringKey
    kind: CatalogItemKind.Movie | CatalogItemKind.Series
    filter: CatalogDiscoverFilter
}

/** Popular catalog titles matching a filter (a genre, a kind of series), on disk and missing mixed. */
const CatalogDiscoverRow: FC<CatalogDiscoverRowProps> = ({ title, kind, filter }) => {
    const t = useTranslation();
    const titles = useCatalogDiscover(kind, filter);
    return (
        <MediaRow
            title={t(title)}
            shape='portrait'
            items={getOpenableItems(titles.data)}
            isPending={titles.isPending}
            isError={titles.isError}
            getKey={getCatalogKey}
            renderItem={renderCatalogCard}
        />
    );
};

const DOCUMENTARY_FILTER: CatalogDiscoverFilter = { genreId: DOCUMENTARY_GENRE_ID };
const TV_SHOW_FILTER: CatalogDiscoverFilter = { tvTypes: TV_SHOW_TYPES };

/** Best sellers or new releases of Audible, in the preferred languages: books to discover, on disk or missing. */
const PopularAudiobooksRow: FC<{ sort: AudiobookPopularSort }> = ({ sort }) => {
    const t = useTranslation();
    const audiobooks = usePopularAudiobooks(sort);
    return (
        <MediaRow
            title={t(sort === 'NewReleases' ? 'RowAudiobookNewReleases' : 'RowAudiobookBestSellers')}
            shape='portrait'
            items={getOpenableItems(audiobooks.data)}
            isPending={audiobooks.isPending}
            isError={audiobooks.isError}
            getKey={getCatalogKey}
            renderItem={renderCatalogCard}
        />
    );
};

/** Books to read trending this week: no row when books are off. */
const TrendingBooksRow: FC = () => {
    const t = useTranslation();
    const books = useTrendingBooks();
    return (
        <MediaRow
            title={t('RowTrendingBooks')}
            shape='portrait'
            items={getOpenableItems(books.data)}
            isPending={books.isPending}
            isError={books.isError}
            getKey={getCatalogKey}
            renderItem={renderCatalogCard}
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
        case DiscoverRow.Downloads:
            return <DownloadsRow />;
        case DiscoverRow.AudiobookBestSellers:
            return <PopularAudiobooksRow sort='BestSellers' />;
        case DiscoverRow.AudiobookNewReleases:
            return <PopularAudiobooksRow sort='NewReleases' />;
        case DiscoverRow.LiveTvOnNow:
            return <LiveTvOnNowRow />;
        case DiscoverRow.Recordings:
            return <RecordingsRow />;
        case DiscoverRow.TrendingBooks:
            return <TrendingBooksRow />;
        case DiscoverRow.DocumentaryMovies:
            return <CatalogDiscoverRow title='RowDocumentaryMovies' kind={CatalogItemKind.Movie} filter={DOCUMENTARY_FILTER} />;
        case DiscoverRow.DocumentarySeries:
            return <CatalogDiscoverRow title='RowDocumentarySeries' kind={CatalogItemKind.Series} filter={DOCUMENTARY_FILTER} />;
        case DiscoverRow.PopularTvShows:
            return <CatalogDiscoverRow title='RowPopularTvShows' kind={CatalogItemKind.Series} filter={TV_SHOW_FILTER} />;
    }
};

/** The catalog source of the featured card of a type, when nothing is being watched. */
const useFeaturedCatalog = (type: DiscoverType) => {
    const forYou = useRecommendedForYou();
    const trending = useTrending(type === DiscoverType.Series ? CatalogItemKind.Series : CatalogItemKind.Movie);
    // Film recommendations stay out of Series
    const sources = type === DiscoverType.Series ? [ trending ] : [ forYou, trending ];
    const items = sources.flatMap(source => source.data ?? []);
    return {
        // The first title with art and a sheet to open: the card is never a plain black box
        featured: items.find(item => !!item.BackdropUrl && !!getCatalogItemPath(item)),
        isLoaded: sources.every(source => !source.isPending)
    };
};

/**
 * Featured card of the video types: what the user is watching, else a
 * recommendation or a trending title, always one with its art.
 */
const Featured: FC<{ type: DiscoverType, pageRef: RefObject<HTMLDivElement> }> = ({ type, pageRef }) => {
    const t = useTranslation();
    const { api } = useApi();
    const navigate = useNavigate();
    const openItem = useOpenItem();
    const { getEpisodeLabel } = useCardRenderers();
    const resume = useResumeItems(getDiskItemTypes(type));
    const catalog = useFeaturedCatalog(type);

    const watching = api ? resume.data?.find(item => !!getBackdropUrl(api, item)) : undefined;
    const fromCatalog = watching ? undefined : catalog.featured;
    const isLoaded = !resume.isPending && (!!watching || catalog.isLoaded);

    const openCatalog = useCallback((path: string | undefined) => {
        if (path) navigate(path);
    }, [ navigate ]);

    // The focus starts on the main action once the featured title is known, not on the picker above it
    useInitialFocus(pageRef, [ watching, fromCatalog, isLoaded ], isLoaded);

    if (watching) {
        return (
            <Hero
                variant='card'
                title={getDisplayTitle(watching)}
                eyebrow={getEpisodeLabel(watching) ?? t('FeaturedContinue')}
                overview={watching.Overview}
                backdropUrl={api ? getBackdropUrl(api, watching) : undefined}
                actions={
                    <>
                        <RoundButton
                            variant='primary'
                            icon={<PlayArrow />}
                            label={isResumable(watching) ? t('ActionResume') : t('ActionPlay')}
                            value={watching}
                            onClick={playItem}
                        />
                        <RoundButton
                            icon={<InfoOutlined />}
                            label={t('ActionMoreInfo')}
                            value={watching}
                            onClick={openItem}
                        />
                    </>
                }
            />
        );
    }

    if (!fromCatalog) return null;

    return (
        <Hero
            variant='card'
            title={fromCatalog.Title}
            eyebrow={fromCatalog.Year ? String(fromCatalog.Year) : undefined}
            overview={fromCatalog.Overview}
            backdropUrl={fromCatalog.BackdropUrl ?? undefined}
            actions={
                <RoundButton
                    variant='primary'
                    icon={<InfoOutlined />}
                    label={t('ActionMoreInfo')}
                    value={getCatalogItemPath(fromCatalog)}
                    onClick={openCatalog}
                />
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
        <div ref={pageRef} className={classNames('pf-home', 'pf-discover', { 'pf-discover--featured': withFeatured })}>
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
