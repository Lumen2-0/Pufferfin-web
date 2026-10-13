import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import classNames from 'classnames';
import React, { type ChangeEvent, type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { Bone, SkeletonRegion } from '../../../components/Skeleton';
import { ErrorOutline, Search } from '../../../components/icons';
import { useTranslation } from '../../../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE, focusElement } from '../../../navigation/focus';
import { getCardImageUrl } from '../../../utils/images';
import { getDisplayTitle, getEpisodeNumbers, getPlayedPercentage } from '../../../utils/items';
import { useOpenItem } from '../../../utils/navigation';
import { isPlayableItem } from '../../../utils/playback';
import { usePlayItem } from '../../../utils/usePlay';
import { useLibraryGenres, useLibraryItems, useLibraryYears } from '../api/useLibraryItems';
import {
    BOOK_SORTS,
    type CatalogFilters,
    getCountKeys,
    getDecades,
    LIBRARY_SORTS,
    type LibrarySort,
    lowerFirst,
    SORT_LABELS,
    toItemsFilter
} from '../utils/catalogFilters';
import { isAudiobookEntry } from '../utils/library';

import LibraryDropdown, { type DropdownOption } from './LibraryDropdown';
import { LibraryPoster } from './LibraryCards';

/** The text filter follows the typing after a short pause, so each keystroke is not a request. */
const DEBOUNCE_MS = 300;
const SKELETON_COUNT = 18;
const ALL = '';

interface LibraryCatalogProps {
    view: ItemDto
    itemTypes: BaseItemKind[] | null
    libraries: DropdownOption<string>[]
    onSelectLibrary: (id: string) => void
    filters: CatalogFilters
    onFiltersChange: (filters: CatalogFilters) => void
}

const GridSkeleton: FC = () => (
    <SkeletonRegion>
        <ul className='pf-lib-grid' aria-hidden='true'>
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                <li key={index} className='pf-lib-grid__item'>
                    <Bone className='pf-lib-skeleton pf-lib-skeleton--poster' />
                    <Bone className='pf-lib-skeleton pf-lib-skeleton--line' width='80%' />
                    <Bone className='pf-lib-skeleton pf-lib-skeleton--line pf-lib-skeleton--small' width='35%' />
                </li>
            ))}
        </ul>
    </SkeletonRegion>
);

/**
 * Every title of one library: a bar of filters (text, type, genre, decade,
 * not watched, order) over a grid of posters, a page at a time. After Show
 * more, the focus goes to the first new title.
 */
const LibraryCatalog: FC<LibraryCatalogProps> = ({ view, itemTypes, libraries, onSelectLibrary, filters, onFiltersChange }) => {
    const t = useTranslation();
    const { api } = useApi();
    const openItem = useOpenItem();
    const playItem = usePlayItem();
    const gridRef = useRef<HTMLUListElement>(null);
    const parentId = view.Id ?? undefined;
    const libraryName = view.Name ?? '';
    const isBookLibrary = !!itemTypes?.includes(BaseItemKind.AudioBook);

    // The field answers at once, the grid after a pause
    const [ text, setText ] = useState(filters.query);
    useEffect(() => setText(filters.query), [ filters.query ]);
    const [ debouncedText ] = useDebounceValue(text, DEBOUNCE_MS);
    useEffect(() => {
        if (debouncedText !== filters.query) onFiltersChange({ ...filters, query: debouncedText });
        // Only a new text writes it: the other filters already go through onFiltersChange
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ debouncedText ]);
    const onTextChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setText(event.target.value), []);

    const itemsFilter = useMemo(() => toItemsFilter(filters, isBookLibrary), [ filters, isBookLibrary ]);
    const {
        data,
        isPending,
        isError,
        hasNextPage,
        isFetchingNextPage,
        isFetchNextPageError,
        fetchNextPage
    } = useLibraryItems(parentId, itemTypes, itemsFilter);
    const items = useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [ data ]);
    const total = data?.pages[0]?.totalCount ?? 0;

    const genres = useLibraryGenres(isBookLibrary ? undefined : parentId, itemTypes);
    const years = useLibraryYears(isBookLibrary ? undefined : parentId, itemTypes);

    const typeOptions = libraries;
    const genreOptions = useMemo<DropdownOption<string>[]>(() => [
        { id: ALL, label: t('LibraryAllGenres') },
        ...(genres.data ?? []).filter(genre => !!genre.Id).map(genre => ({ id: genre.Id!, label: genre.Name ?? '' }))
    ], [ genres.data, t ]);
    const decadeOptions = useMemo<DropdownOption<string>[]>(() => [
        { id: ALL, label: t('LibraryAllYears') },
        ...getDecades(years.data ?? []).map(decade => ({ id: String(decade), label: t('LibraryDecade', decade) }))
    ], [ t, years.data ]);
    const sortOptions = useMemo<DropdownOption<LibrarySort>[]>(
        () => (isBookLibrary ? BOOK_SORTS : LIBRARY_SORTS).map(sort => ({ id: sort, label: t(SORT_LABELS[sort]) })),
        [ isBookLibrary, t ]
    );

    const chosenGenre = genreOptions.find(option => option.id === filters.genreId && option.id !== ALL);
    const onGenre = useCallback((id: string) => onFiltersChange({ ...filters, genreId: id || undefined }), [ filters, onFiltersChange ]);
    const onDecade = useCallback((id: string) => onFiltersChange({ ...filters, decade: id ? Number(id) : undefined }), [ filters, onFiltersChange ]);
    const onSort = useCallback((sort: LibrarySort) => onFiltersChange({ ...filters, sort }), [ filters, onFiltersChange ]);
    const onUnplayed = useCallback(() => onFiltersChange({ ...filters, isUnplayed: !filters.isUnplayed }), [ filters, onFiltersChange ]);

    // The query is kept with the index, so a page that lands after a filter change does not pull the focus
    const queryKey = JSON.stringify([ parentId, itemTypes, itemsFilter ]);
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

    const countKeys = getCountKeys(itemTypes);
    const sortLabel = t(SORT_LABELS[filters.sort]);

    const getSubtitle = (item: ItemDto) => {
        if (isAudiobookEntry(item) && item.AlbumArtist) return item.AlbumArtist;
        const numbers = getEpisodeNumbers(item);
        if (numbers) return t('EpisodeNumber', numbers[0], numbers[1]);
        return item.ProductionYear ? String(item.ProductionYear) : undefined;
    };

    let grid: React.ReactNode;
    if (isError) {
        // Failure is told with an icon and words, never with color alone
        grid = (
            <p className='pf-row__error' role='status'>
                <ErrorOutline aria-hidden='true' />
                {t('LibraryLoadError')}
            </p>
        );
    } else if (isPending) {
        grid = <GridSkeleton />;
    } else if (!items.length) {
        grid = <p className='pf-lib__note'>{filters.query || filters.genreId || filters.decade || filters.isUnplayed ? t('LibraryNoMatch') : t('LibraryEmpty')}</p>;
    } else {
        grid = (
            <ul ref={gridRef} className='pf-lib-grid' aria-busy={isFetchingNextPage}>
                {items.map(item => {
                    const progress = getPlayedPercentage(item);
                    const progressKey = isAudiobookEntry(item) ? 'ListenedPercent' : 'WatchedPercent';
                    return (
                        <li key={item.Id ?? ''} className='pf-lib-grid__item'>
                            <LibraryPoster
                                item={item}
                                title={item.SeriesName && getEpisodeNumbers(item) ? item.SeriesName : getDisplayTitle(item)}
                                subtitle={getSubtitle(item)}
                                imageUrl={api ? getCardImageUrl(api, item, 'portrait') : undefined}
                                progress={progress}
                                progressLabel={progress ? t(progressKey, progress) : undefined}
                                isPlayed={!!item.UserData?.Played}
                                onOpen={openItem}
                                onPlay={isPlayableItem(item) ? playItem : undefined}
                            />
                        </li>
                    );
                })}
            </ul>
        );
    }

    return (
        <section className='pf-lib__catalog' aria-label={libraryName}>
            <div className='pf-lib-toolbar'>
                <label className='pf-lib-search'>
                    <span className='pf-visually-hidden'>{t('LibraryFilterIn', libraryName)}</span>
                    <Search className='pf-lib-search__icon' aria-hidden='true' />
                    <input
                        className='pf-lib-search__input'
                        type='search'
                        value={text}
                        onChange={onTextChange}
                        placeholder={t('LibraryFilterIn', libraryName)}
                        autoComplete='off'
                        spellCheck={false}
                        {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                    />
                </label>
                {typeOptions.length > 1 && (
                    <LibraryDropdown
                        label={libraryName}
                        ariaLabel={t('DiscoverTypePicker')}
                        options={typeOptions}
                        selectedId={parentId}
                        onSelect={onSelectLibrary}
                    />
                )}
                {!isBookLibrary && (
                    <>
                        <LibraryDropdown
                            label={chosenGenre?.label ?? t('LibraryGenrePicker')}
                            ariaLabel={t('LibraryGenrePicker')}
                            options={genreOptions}
                            selectedId={filters.genreId ?? ALL}
                            onSelect={onGenre}
                            isActive={!!chosenGenre}
                        />
                        <LibraryDropdown
                            label={filters.decade ? t('LibraryDecade', filters.decade) : t('LibraryYearPicker')}
                            ariaLabel={t('LibraryYearPicker')}
                            options={decadeOptions}
                            selectedId={filters.decade ? String(filters.decade) : ALL}
                            onSelect={onDecade}
                            isActive={!!filters.decade}
                        />
                        <button
                            type='button'
                            className={classNames('pf-lib-chip', 'pf-lib-chip--toggle', { 'pf-lib-chip--active': filters.isUnplayed })}
                            aria-pressed={filters.isUnplayed}
                            onClick={onUnplayed}
                            {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                        >
                            {t('LibraryUnplayed')}
                        </button>
                    </>
                )}
                <span className='pf-lib-toolbar__spacer' />
                {!isPending && !isError && (
                    <span className='pf-lib-toolbar__count' role='status'>
                        {t(total === 1 ? countKeys.one : countKeys.count, total)}
                    </span>
                )}
                <LibraryDropdown
                    label={t('LibrarySortLabel', lowerFirst(sortLabel))}
                    ariaLabel={t('LibrarySortPicker')}
                    options={sortOptions}
                    selectedId={filters.sort}
                    onSelect={onSort}
                    align='end'
                    isLabelled={false}
                />
            </div>

            {grid}

            {isFetchNextPageError && (
                <p className='pf-row__error' role='status'>
                    <ErrorOutline aria-hidden='true' />
                    {t('LibraryLoadError')}
                </p>
            )}
            {!isPending && !isError && items.length > 0 && total > items.length && (
                <div className='pf-lib-more'>
                    <span className='pf-lib-more__count'>{t(countKeys.progress, items.length, total)}</span>
                    <span className='pf-lib-more__bar' aria-hidden='true'>
                        <span className='pf-lib-more__fill' style={{ width: `${Math.round((items.length / total) * 100)}%` }} />
                    </span>
                    {hasNextPage && (
                        <button
                            type='button'
                            className='pf-lib-chip pf-lib-chip--more'
                            onClick={onShowMore}
                            {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                        >
                            {isFetchingNextPage ? t('Loading') : t('ActionShowMore')}
                        </button>
                    )}
                </div>
            )}
        </section>
    );
};

export default LibraryCatalog;
