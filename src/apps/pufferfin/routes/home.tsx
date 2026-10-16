import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import classNames from 'classnames';
import React, { type FC, type RefObject, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import CatalogCard from '../components/CatalogCard';
import HeroCarousel, { type HeroSlide } from '../components/HeroCarousel';
import { CarouselSkeleton } from '../components/Skeleton';
import MediaRow from '../components/MediaRow';
import PosterCard from '../components/PosterCard';
import Rail from '../components/Rail';
import HeroQuickActions from '../components/HeroQuickActions';
import ImdbButton from '../components/ImdbButton';
import RoundButton from '../components/RoundButton';
import { CatalogAvailability, CatalogItemKind, type CatalogItem } from '../features/catalog/api/types';
import {
    type AudiobookPopularSort,
    type CatalogDiscoverFilter,
    useCatalogDiscover,
    useCatalogGenres,
    usePopularAudiobooks,
    useRecommendedForYou,
    useTrending,
    useBrands
} from '../features/catalog/api/useCatalog';
import { getCatalogItemPath } from '../features/catalog/utils/catalog';
import { useHiddenGenres } from '../features/preferences/useHiddenGenres';
import { useVisibleCatalogItems } from '../features/preferences/useVisibleCatalogItems';
import { useLiveTvOnNow, useRecordings } from '../features/discover/api/useDiscoverRows';
import ThemeRowView from '../features/discover/components/ThemeRowView';
import BrandPicker from '../features/discover/components/BrandPicker';
import {
    DISCOVER_TYPE_LABELS,
    DISCOVER_TYPE_PARAM,
    DiscoverRow,
    DiscoverType,
    ANIMATION_GENRE_ID,
    DOCUMENTARY_GENRE_ID,
    getDiscoverRows,
    getSeason,
    rankSeasonal,
    getDiskItemTypes,
    hasFeatured,
    parseDiscoverType,
    TV_SHOW_TYPES
} from '../features/discover/utils/discover';
import { pickThemeRows } from '../features/discover/utils/themes';
import BookmarksRow from '../features/bookmarks/BookmarksRow';
import { BecauseYouWatchedRow, LatestRow, SortedCatalogRow, SuggestionsRow } from '../features/discover/components/DiscoverRows';
import ResumeRow from '../features/discover/components/ResumeRow';
import TopTenRow from '../features/discover/components/TopTenRow';
import { useResumeItems } from '../features/home/api/useHomeRows';
import '../features/discover/discover.scss';
import DownloadsRow from '../features/requests/components/DownloadsRow';
import type { StringKey } from '../i18n/translate';
import { useTranslation } from '../i18n/useTranslation';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { type CardShape, getCardImageUrl } from '../utils/images';
import { getDisplayTitle, getEpisodeNumbers, getPlayedPercentage } from '../utils/items';
import { useOpenItem } from '../utils/navigation';
import { isPlayableItem } from '../utils/playback';
import { usePlayItem, usePlayItemId } from '../utils/usePlay';
import { InfoOutlined, PlayArrow } from '../components/icons';

const getKey = (item: ItemDto) => item.Id ?? '';

/** The brand of the address: a streaming service, a studio or a network, by its key. */
const BRAND_PARAM = 'brand';
const parseBrand = (value: string | null) => (value && /^[a-z0-9]{1,24}$/.test(value) ? value : undefined);
const getCatalogKey = (item: CatalogItem) => item.Key;
const renderCatalogCard = (item: CatalogItem) => <CatalogCard item={item} />;
const renderTaggedCatalogCard = (item: CatalogItem) => <CatalogCard item={item} showKind />;

/** Card renderers shared by the library rows of every type. */
function useCardRenderers() {
    const t = useTranslation();
    const { api } = useApi();
    const openItem = useOpenItem();
    const playCard = usePlayItem();

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
                    onPlay={isPlayableItem(item) ? playCard : undefined}
                />
            );
        };
        return CardRenderer;
    }, [ api, getEpisodeLabel, openItem, playCard, t ]);

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

/** What just arrived on the server, of the type: films, series (grouped from their episodes), or both. */
const getLatestItemTypes = (type: DiscoverType): BaseItemKind[] | undefined => {
    if (type === DiscoverType.Movies) return [ BaseItemKind.Movie ];
    if (type === DiscoverType.Series) return [ BaseItemKind.Episode ];
    return [ BaseItemKind.Movie, BaseItemKind.Episode ];
};

/** The kinds "Because you watched" looks back at. */
const getTitleKinds = (type: DiscoverType): Array<CatalogItemKind.Movie | CatalogItemKind.Series> => {
    if (type === DiscoverType.Movies) return [ CatalogItemKind.Movie ];
    if (type === DiscoverType.Series) return [ CatalogItemKind.Series ];
    return [ CatalogItemKind.Movie, CatalogItemKind.Series ];
};

const getBookmarkKind = (type: DiscoverType) => {
    if (type === DiscoverType.Movies) return CatalogItemKind.Movie;
    if (type === DiscoverType.Series) return CatalogItemKind.Series;
    return undefined;
};

const TrendingRow: FC<{ kind: CatalogItemKind.Movie | CatalogItemKind.Series }> = ({ kind }) => {
    const t = useTranslation();
    const visible = useVisibleCatalogItems();
    const trending = useTrending(kind);
    return (
        <MediaRow
            title={t(kind === CatalogItemKind.Movie ? 'RowTrendingMovies' : 'RowTrendingShows')}
            shape='portrait'
            items={visible(trending.data)}
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
    const visible = useVisibleCatalogItems();
    const titles = useCatalogDiscover(kind, filter);
    return (
        <MediaRow
            title={t(title)}
            shape='portrait'
            items={visible(titles.data)}
            isPending={titles.isPending}
            isError={titles.isError}
            getKey={getCatalogKey}
            renderItem={renderCatalogCard}
        />
    );
};

const DOCUMENTARY_FILTER: CatalogDiscoverFilter = { genreId: DOCUMENTARY_GENRE_ID };
const TV_SHOW_FILTER: CatalogDiscoverFilter = { tvTypes: TV_SHOW_TYPES };
const ANIME_FILTER: CatalogDiscoverFilter = { genreId: ANIMATION_GENRE_ID, originalLanguage: 'ja', sort: 'TopRated' };

/**
 * The films and series of the season (Halloween, Christmas...), only in its weeks: the ones the public loves most,
 * not the latest, those with the most genres of the theme first.
 */
const SeasonalRow: FC = () => {
    const t = useTranslation();
    const visible = useVisibleCatalogItems();
    const season = getSeason();
    const keywords = season?.keywordIds.join(',');
    const movies = useCatalogDiscover(CatalogItemKind.Movie, { keywords, genreId: season?.movieGenreId, sort: 'TopRated' }, !!season);
    const series = useCatalogDiscover(CatalogItemKind.Series, { keywords, sort: 'TopRated' }, !!season);
    const items = useMemo(
        () => season && movies.data && series.data && rankSeasonal([ movies.data, series.data ], season.genreIds),
        [ season, movies.data, series.data ]
    );
    if (!season) return null;
    return (
        <MediaRow
            title={t(season.title)}
            shape='portrait'
            items={visible(items)}
            isPending={movies.isPending || series.isPending}
            isError={movies.isError && series.isError}
            getKey={getCatalogKey}
            renderItem={renderTaggedCatalogCard}
        />
    );
};

/** Best sellers or new releases of Audible, in the preferred languages: books to discover, on disk or missing. */
const PopularAudiobooksRow: FC<{ sort: AudiobookPopularSort }> = ({ sort }) => {
    const t = useTranslation();
    const visible = useVisibleCatalogItems();
    const audiobooks = usePopularAudiobooks(sort);
    return (
        <MediaRow
            title={t(sort === 'NewReleases' ? 'RowAudiobookNewReleases' : 'RowAudiobookBestSellers')}
            shape='portrait'
            items={visible(audiobooks.data)}
            isPending={audiobooks.isPending}
            isError={audiobooks.isError}
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
        case DiscoverRow.TopMoviesWeek:
            return <TopTenRow kind={CatalogItemKind.Movie} period='week' />;
        case DiscoverRow.TopMoviesMonth:
            return <TopTenRow kind={CatalogItemKind.Movie} period='month' />;
        case DiscoverRow.TopMoviesYear:
            return <TopTenRow kind={CatalogItemKind.Movie} period='year' />;
        case DiscoverRow.TopShowsWeek:
            return <TopTenRow kind={CatalogItemKind.Series} period='week' />;
        case DiscoverRow.TopShowsMonth:
            return <TopTenRow kind={CatalogItemKind.Series} period='month' />;
        case DiscoverRow.TopShowsYear:
            return <TopTenRow kind={CatalogItemKind.Series} period='year' />;
        case DiscoverRow.ContinueWatching:
            return <ResumeRow itemTypes={getDiskItemTypes(type)} />;
        case DiscoverRow.Seasonal:
            return <SeasonalRow />;
        case DiscoverRow.NewOnServer:
            return <LatestRow itemTypes={getLatestItemTypes(type)} />;
        case DiscoverRow.BecauseYouWatched:
            return <BecauseYouWatchedRow kinds={getTitleKinds(type)} />;
        case DiscoverRow.NewReleasesMovies:
            return <SortedCatalogRow kind={CatalogItemKind.Movie} sort='Newest' />;
        case DiscoverRow.NewReleasesSeries:
            return <SortedCatalogRow kind={CatalogItemKind.Series} sort='Newest' />;
        case DiscoverRow.ClassicsMovies:
            return <SortedCatalogRow kind={CatalogItemKind.Movie} sort='TopRated' />;
        case DiscoverRow.ClassicsSeries:
            return <SortedCatalogRow kind={CatalogItemKind.Series} sort='TopRated' />;
        case DiscoverRow.ClassicsAnime:
            return <CatalogDiscoverRow title='RowClassicsAnime' kind={CatalogItemKind.Series} filter={ANIME_FILTER} />;
        case DiscoverRow.Bookmarks:
            return <BookmarksRow kind={getBookmarkKind(type)} />;
        case DiscoverRow.RecommendedForYou:
            return <SuggestionsRow />;
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
        case DiscoverRow.DocumentaryMovies:
            return <CatalogDiscoverRow title='RowDocumentaryMovies' kind={CatalogItemKind.Movie} filter={DOCUMENTARY_FILTER} />;
        case DiscoverRow.DocumentarySeries:
            return <CatalogDiscoverRow title='RowDocumentarySeries' kind={CatalogItemKind.Series} filter={DOCUMENTARY_FILTER} />;
        case DiscoverRow.PopularTvShows:
            return <CatalogDiscoverRow title='RowPopularTvShows' kind={CatalogItemKind.Series} filter={TV_SHOW_FILTER} />;
    }
};

interface ProviderSpec {
    kind: CatalogItemKind.Movie | CatalogItemKind.Series
    filter: CatalogDiscoverFilter
}

/** The films and series a type lists within a streaming service. */
function getProviderSpecs(type: DiscoverType): ProviderSpec[] {
    switch (type) {
        case DiscoverType.Movies:
            return [ { kind: CatalogItemKind.Movie, filter: {} } ];
        case DiscoverType.Series:
            return [ { kind: CatalogItemKind.Series, filter: {} } ];
        case DiscoverType.TvShows:
            return [ { kind: CatalogItemKind.Series, filter: TV_SHOW_FILTER } ];
        case DiscoverType.Documentaries:
            return [ { kind: CatalogItemKind.Movie, filter: DOCUMENTARY_FILTER }, { kind: CatalogItemKind.Series, filter: DOCUMENTARY_FILTER } ];
        default:
            return [ { kind: CatalogItemKind.Movie, filter: {} }, { kind: CatalogItemKind.Series, filter: {} } ];
    }
}

const PROVIDER_ROW_TITLES: Record<ProviderSpec['kind'], Record<'Popular' | 'Newest' | 'TopRated', StringKey>> = {
    [CatalogItemKind.Movie]: { Popular: 'ProviderPopularMovies', Newest: 'ProviderNewMovies', TopRated: 'ProviderTopMovies' },
    [CatalogItemKind.Series]: { Popular: 'ProviderPopularSeries', Newest: 'ProviderNewSeries', TopRated: 'ProviderTopSeries' }
};

const ProviderRow: FC<{ spec: ProviderSpec, sort: 'Popular' | 'Newest' | 'TopRated', brand: string, name: string }> = ({ spec, sort, brand, name }) => {
    const t = useTranslation();
    const visible = useVisibleCatalogItems();
    const filter = useMemo(() => ({ ...spec.filter, sort, brand }), [ sort, spec.filter, brand ]);
    const titles = useCatalogDiscover(spec.kind, filter);
    return (
        <MediaRow
            title={t(PROVIDER_ROW_TITLES[spec.kind][sort], name)}
            shape='portrait'
            items={visible(titles.data)}
            isPending={titles.isPending}
            isError={titles.isError}
            getKey={getCatalogKey}
            renderItem={renderCatalogCard}
        />
    );
};

/** The first rows within a streaming service: its popular, new and best rated films and series. */
const ProviderRows: FC<{ type: DiscoverType, brand: string }> = ({ type, brand }) => {
    const { data: brands } = useBrands();
    const name = brands?.find(item => item.Key === brand)?.Name ?? '';
    const specs = getProviderSpecs(type);
    const sorts = [ 'Popular', 'Newest', 'TopRated' ] as const;
    return (
        <>
            {sorts.flatMap(sort => specs.map(spec => (
                <ProviderRow key={`${spec.kind}-${sort}`} spec={spec} sort={sort} brand={brand} name={name} />
            )))}
        </>
    );
};

/** How many titles the carousel of a screen shows. */
const FEATURED_COUNT = 6;

/** Takes the lists in turn, one entry of each at a time, so no source fills the carousel alone. */
function interleave<T>(lists: T[][]): T[] {
    const result: T[] = [];
    const longest = Math.max(0, ...lists.map(list => list.length));
    for (let index = 0; index < longest; index++) {
        lists.forEach(list => {
            if (index < list.length) result.push(list[index]);
        });
    }
    return result;
}

/** The catalog titles of the carousel of a type: each source is read only for the types that show it. */
const useFeaturedCatalog = (type: DiscoverType, brand?: string) => {
    // Within a streaming service: its most popular films and series, nothing else
    const specs = brand ? getProviderSpecs(type) : [];
    const movieSpec = specs.find(spec => spec.kind === CatalogItemKind.Movie);
    const seriesSpec = specs.find(spec => spec.kind === CatalogItemKind.Series);
    const providerMovies = useCatalogDiscover(CatalogItemKind.Movie, { ...movieSpec?.filter, brand }, !!movieSpec);
    const providerSeries = useCatalogDiscover(CatalogItemKind.Series, { ...seriesSpec?.filter, brand }, !!seriesSpec);

    const isAll = type === DiscoverType.All && !brand;
    const withMovies = !brand && (isAll || type === DiscoverType.Movies);
    const withSeries = !brand && (isAll || type === DiscoverType.Series);
    const isTvShows = !brand && type === DiscoverType.TvShows;
    const isDocumentaries = !brand && type === DiscoverType.Documentaries;

    const forYou = useRecommendedForYou();
    const trendingMovies = useTrending(CatalogItemKind.Movie);
    const trendingSeries = useTrending(CatalogItemKind.Series);
    const tvShows = useCatalogDiscover(CatalogItemKind.Series, TV_SHOW_FILTER, isTvShows);
    const docMovies = useCatalogDiscover(CatalogItemKind.Movie, DOCUMENTARY_FILTER, isDocumentaries);
    const docSeries = useCatalogDiscover(CatalogItemKind.Series, DOCUMENTARY_FILTER, isDocumentaries);

    const sources = [
        movieSpec ? providerMovies : undefined,
        seriesSpec ? providerSeries : undefined,
        withMovies ? forYou : undefined,
        withMovies ? trendingMovies : undefined,
        withSeries ? trendingSeries : undefined,
        isTvShows ? tvShows : undefined,
        isDocumentaries ? docMovies : undefined,
        isDocumentaries ? docSeries : undefined
    ].filter(source => !!source);

    const keys = new Set<string>();
    const items = interleave(sources.map(source => source.data ?? []))
        // Titles with art and a sheet to open only: a slide is never a plain black box
        .filter(item => !!item.BackdropUrl && !!getCatalogItemPath(item) && !keys.has(item.Key) && !!keys.add(item.Key));
    return { items, isLoaded: sources.every(source => !source.isPending) };
};

/**
 * Featured carousel of a Discover screen, one screen high: recommendations and
 * trending titles, always with art. What the user is in the middle of watching
 * stays out of it: that is the Continue Watching row.
 */
const Featured: FC<{ type: DiscoverType, brand?: string, pageRef: RefObject<HTMLDivElement> }> = ({ type, brand, pageRef }) => {
    const t = useTranslation();
    const navigate = useNavigate();
    const resume = useResumeItems(getDiskItemTypes(type));
    const catalog = useFeaturedCatalog(type, brand);
    const playItemId = usePlayItemId();

    const openCatalog = useCallback((path: string | undefined) => {
        if (path) navigate(path);
    }, [ navigate ]);

    // The titles being watched, by library id, and the series of the episodes being watched
    const watchedIds = useMemo(() => new Set((resume.data ?? []).flatMap(item => [ item.Id, item.SeriesId ]).filter(Boolean)), [ resume.data ]);

    const movieGenres = useCatalogGenres(CatalogItemKind.Movie).data;
    const seriesGenres = useCatalogGenres(CatalogItemKind.Series).data;
    const getGenres = (item: CatalogItem) => {
        const names = new Map((item.Kind === CatalogItemKind.Series ? seriesGenres : movieGenres)?.map(genre => [ genre.Id, genre.Name ]));
        return (item.GenreIds ?? []).map(id => names.get(id)).filter(Boolean).slice(0, 3);
    };

    const slides: HeroSlide[] = catalog.items
        .filter(item => !item.LocalItemId || !watchedIds.has(item.LocalItemId))
        .map(item => {
            const isOnDisk = item.Availability === CatalogAvailability.OnDisk && !!item.LocalItemId;
            const kindLabel = t(item.Kind === CatalogItemKind.Series ? 'HeroBadgeSeries' : 'HeroBadgeMovie');
            const infoButton = (
                <RoundButton
                    variant={isOnDisk ? 'quiet' : 'primary'}
                    icon={<InfoOutlined />}
                    label={t(item.Kind === CatalogItemKind.Series ? 'HeroSheetSeries' : 'HeroSheetMovie')}
                    value={getCatalogItemPath(item)}
                    onClick={openCatalog}
                />
            );
            return {
                key: item.Key,
                title: item.Title,
                meta: [ ...getGenres(item), item.Year ? String(item.Year) : undefined ].filter(Boolean).join(' · '),
                badges: [ kindLabel ],
                overview: item.Overview,
                backdropUrl: item.BackdropUrl!,
                // On disk: it plays from here, with its sheet beside; missing: its sheet, with Download
                actions: isOnDisk ? (
                    <>
                        <span className='pf-hero__group'>
                            <RoundButton
                                variant='primary'
                                icon={<PlayArrow />}
                                label={t('ActionPlay')}
                                value={item.LocalItemId!}
                                onClick={playItemId}
                            />
                            {infoButton}
                            <ImdbButton item={item} />
                        </span>
                        <span className='pf-hero__group'>
                            <HeroQuickActions item={item} />
                        </span>
                    </>
                ) : (
                    <>
                        <span className='pf-hero__group'>
                            {infoButton}
                            <ImdbButton item={item} />
                        </span>
                        <span className='pf-hero__group'>
                            <HeroQuickActions item={item} />
                        </span>
                    </>
                )
            };
        })
        .slice(0, FEATURED_COUNT);

    const isLoaded = !resume.isPending && (catalog.isLoaded || slides.length > 0);

    // The focus starts on the main action once the first title is known, not on the picker above it
    useInitialFocus(pageRef, [ slides.length > 0, isLoaded ], isLoaded);

    // The card keeps its place while the titles load: the rows below never jump
    if (!slides.length) return isLoaded ? null : <CarouselSkeleton />;
    return <HeroCarousel slides={slides} />;
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
    // Books and audiobooks are not on streaming services: no service filter for them
    const withProviders = hasFeatured(type);
    const brand = withProviders ? parseBrand(searchParams.get(BRAND_PARAM)) : undefined;
    // The themed rows of the screen for this part of the day: the same on Back, others a few hours later
    const { data: brands } = useBrands();
    const isNetwork = brands?.find(item => item.Key === brand)?.Kind === 'Network';
    const { hidden: hiddenGenres } = useHiddenGenres();
    const themeRows = useMemo(
        () => pickThemeRows(type, Date.now(), { titlesOnly: !!brand, seriesOnly: isNetwork, hiddenGenres }),
        [ type, brand, isNetwork, hiddenGenres ]
    );

    // The type and the service live in the address, so Back finds the screen as it was
    const setFilters = useCallback((nextType: DiscoverType, nextBrand: string | undefined) => {
        const params: Record<string, string> = {};
        if (nextType !== DiscoverType.All) params[DISCOVER_TYPE_PARAM] = nextType;
        if (nextBrand && hasFeatured(nextType)) params[BRAND_PARAM] = nextBrand;
        setSearchParams(params, { replace: true });
    }, [ setSearchParams ]);
    const onBrandChange = useCallback((next: string | undefined) => setFilters(type, next), [ setFilters, type ]);

    // Without a featured title, the picker is the starting point
    useInitialFocus(pageRef, [ type ], !withFeatured);

    return (
        <div ref={pageRef} className={classNames('pf-home', 'pf-discover', { 'pf-discover--featured': withFeatured })}>
            {/* The page title for assistive technologies; the picker says which type is shown */}
            {!withFeatured && <h1 className='pf-visually-hidden'>{t('DiscoverTitle', t(DISCOVER_TYPE_LABELS[type]))}</h1>}
            {withFeatured && <Featured key={`${type}-${brand ?? ''}`} type={type} brand={brand} pageRef={pageRef} />}

            {/* Right under the featured card: the streaming services, the studios, the network */}
            {withProviders && (
                <Rail as='div' className='pf-discover__brands'>
                    <BrandPicker value={brand} onChange={onBrandChange} />
                </Rail>
            )}

            <div className='pf-home__rows pf-discover__rows'>
                {brand ?
                    <ProviderRows type={type} brand={brand} /> :
                    getDiscoverRows(type).map(row => <DiscoverRowView key={`${type}-${row}`} row={row} type={type} />)}
                {brand && themeRows.map(row => <ThemeRowView key={`${row.id}-${brand ?? ''}`} row={row} brand={brand} />)}
            </div>
            {/* Shown by the style sheet only when every row above came back empty */}
            <p className='pf-home__empty pf-discover__empty'>{t('DiscoverEmpty')}</p>
        </div>
    );
};

Component.displayName = 'PufferfinDiscoverPage';
