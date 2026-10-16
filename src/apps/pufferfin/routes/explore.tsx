import React, { type FC, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import CatalogCard from '../components/CatalogCard';
import MediaRow from '../components/MediaRow';
import { type CatalogItem, CatalogAvailability, CatalogItemKind } from '../features/catalog/api/types';
import { useCatalogDiscover } from '../features/catalog/api/useCatalog';
import { rankSeasonal } from '../features/discover/utils/discover';
import LibraryDropdown, { type DropdownOption } from '../features/library/components/LibraryDropdown';
import { GENRE_PREFERENCES, type GenreKey } from '../features/preferences/genres';
import { useVisibleCatalogItems } from '../features/preferences/useVisibleCatalogItems';
import type { StringKey } from '../i18n/translate';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE } from '../navigation/focus';
import { useInitialFocus } from '../navigation/useInitialFocus';

import '../features/library/library.scss';

const EXPLORE_GENRES: GenreKey[] = [
    'action', 'comedy', 'drama', 'horror', 'thriller', 'scifi', 'fantasy', 'romance', 'animation',
    'crime', 'mystery', 'adventure', 'family', 'documentary', 'history', 'war', 'western'
];
const GENRES = EXPLORE_GENRES.map(key => GENRE_PREFERENCES.find(genre => genre.key === key)!);
const GENRE_LABELS = Object.fromEntries(EXPLORE_GENRES.map(key => [
    key,
    `ExploreGenre${key[0].toUpperCase()}${key.slice(1)}`
])) as Record<GenreKey, StringKey>;

type Sort = 'Popular' | 'TopRated' | 'Newest';
type KindChoice = 'all' | 'movies' | 'series';

const SORTS: { id: Sort, label: StringKey }[] = [
    { id: 'Popular', label: 'ExploreSortPopular' },
    { id: 'TopRated', label: 'ExploreSortTopRated' },
    { id: 'Newest', label: 'ExploreSortNewest' }
];
const KINDS: { id: KindChoice, label: StringKey }[] = [
    { id: 'all', label: 'ExploreKindAll' },
    { id: 'movies', label: 'ExploreKindMovies' },
    { id: 'series', label: 'ExploreKindSeries' }
];

const GENRE_PARAM = 'genre';
const KIND_PARAM = 'kind';
const SORT_PARAM = 'sort';

const getKey = (item: CatalogItem) => item.Key;
const renderCard = (item: CatalogItem) => <CatalogCard item={item} showKind />;
const isMissing = (item: CatalogItem) => item.Availability !== CatalogAvailability.OnDisk;

interface GenreRowProps {
    title: string
    tmdbIds: number[]
    kind: KindChoice
    sort: Sort
}

/** Films and series of one genre to pick from, none on the server yet; mixed, or only one kind when asked. */
const GenreRow: FC<GenreRowProps> = ({ title, tmdbIds, kind, sort }) => {
    const visible = useVisibleCatalogItems();
    const withMovies = kind !== 'series';
    const withSeries = kind !== 'movies';
    // TMDB names the same genre differently for series (Action and Adventure, Sci-Fi and Fantasy, War and Politics)
    const movies = useCatalogDiscover(CatalogItemKind.Movie, { genreId: tmdbIds[0], sort }, withMovies);
    const series = useCatalogDiscover(CatalogItemKind.Series, { genreId: tmdbIds[1] ?? tmdbIds[0], sort }, withSeries);
    const isPending = (withMovies && movies.isPending) || (withSeries && series.isPending);
    const isError = (!withMovies || movies.isError) && (!withSeries || series.isError);
    const items = useMemo(() => {
        if (isPending) return undefined;
        const lists = [ withMovies ? movies.data ?? [] : [], withSeries ? series.data ?? [] : [] ];
        return visible(rankSeasonal(lists, []))?.filter(isMissing);
    }, [ isPending, withMovies, withSeries, movies.data, series.data, visible ]);
    return (
        <MediaRow
            title={title}
            shape='portrait'
            items={items}
            isPending={isPending}
            isError={isError}
            getKey={getKey}
            renderItem={renderCard}
        />
    );
};

/** Films and series to discover by genre, none of them on the server yet. Genre, kind and order live in the address. */
export const Component = () => {
    const t = useTranslation();
    const pageRef = useRef<HTMLDivElement>(null);
    const [ searchParams, setSearchParams ] = useSearchParams();
    useInitialFocus(pageRef, [], true);

    const genre = GENRES.find(item => item.key === searchParams.get(GENRE_PARAM));
    const kind = KINDS.find(item => item.id === searchParams.get(KIND_PARAM))?.id ?? 'all';
    const sort = SORTS.find(item => item.id === searchParams.get(SORT_PARAM))?.id ?? 'Popular';

    const setParam = useCallback((name: string, value: string | undefined) => {
        const next = new URLSearchParams(searchParams);
        if (value) next.set(name, value);
        else next.delete(name);
        setSearchParams(next, { replace: true });
    }, [ searchParams, setSearchParams ]);
    const onGenre = useCallback((id: string) => setParam(GENRE_PARAM, id === 'all' ? undefined : id), [ setParam ]);
    const onKind = useCallback((id: KindChoice) => setParam(KIND_PARAM, id === 'all' ? undefined : id), [ setParam ]);
    const onSort = useCallback((id: Sort) => setParam(SORT_PARAM, id === 'Popular' ? undefined : id), [ setParam ]);

    const genreOptions = useMemo<DropdownOption<string>[]>(
        () => [ { id: 'all', label: t('ExploreAllGenres') }, ...GENRES.map(item => ({ id: item.key, label: t(GENRE_LABELS[item.key]) })) ],
        [ t ]
    );
    const kindOptions = useMemo(() => KINDS.map(item => ({ id: item.id, label: t(item.label) })), [ t ]);
    const sortOptions = useMemo(() => SORTS.map(item => ({ id: item.id, label: t(item.label) })), [ t ]);
    const shown = genre ? [ genre ] : GENRES;

    return (
        <div ref={pageRef} className='pf-library'>
            <h1 className='pf-library__title'>{t('NavExplore')}</h1>
            <div className='pf-lib-toolbar pf-library__filters'>
                <LibraryDropdown
                    label={genre ? t(GENRE_LABELS[genre.key]) : t('ExploreGenrePicker')}
                    ariaLabel={t('ExploreGenrePicker')}
                    options={genreOptions}
                    selectedId={genre?.key ?? 'all'}
                    onSelect={onGenre}
                    isActive={!!genre}
                />
                <LibraryDropdown
                    label={t(KINDS.find(item => item.id === kind)!.label)}
                    ariaLabel={t('ExploreKindPicker')}
                    options={kindOptions}
                    selectedId={kind}
                    onSelect={onKind}
                    isActive={kind !== 'all'}
                />
                <LibraryDropdown
                    label={t(SORTS.find(item => item.id === sort)!.label)}
                    ariaLabel={t('ExploreSortPicker')}
                    options={sortOptions}
                    selectedId={sort}
                    onSelect={onSort}
                    align='end'
                />
            </div>
            <section className='pf-library__shelf' aria-label={t('NavExplore')} {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}>
                {shown.map(item => (
                    <GenreRow key={item.key} title={t(GENRE_LABELS[item.key])} tmdbIds={item.tmdbIds} kind={kind} sort={sort} />
                ))}
            </section>
        </div>
    );
};

Component.displayName = 'PufferfinExplorePage';
