import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { CollectionType } from '@jellyfin/sdk/lib/generated-client/models/collection-type';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import React, { type FC, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { appRouter } from 'components/router/appRouter';
import { useUserViews } from 'hooks/api/useUserViews';
import { useApi } from 'hooks/useApi';
import { toLocaleDateString } from 'scripts/datetime';
import type { ItemDto } from 'types/base/models/item-dto';

import ChoicePicker from '../components/ChoicePicker';
import MediaRow from '../components/MediaRow';
import PosterCard from '../components/PosterCard';
import {
    type LibraryItemsFilter,
    useLatestInLibrary,
    useLibraryGenres,
    useLibraryNextUp,
    useLibraryResume,
    useLibraryStudios,
    useUpcomingEpisodes
} from '../features/library/api/useLibraryItems';
import LibraryGrid from '../features/library/components/LibraryGrid';
import { getViewItemTypes } from '../features/library/utils/library';
import {
    getLibraryTabs,
    LIBRARY_FILTER_PARAM,
    LIBRARY_TAB_LABELS,
    LIBRARY_TAB_PARAM,
    LibraryTab,
    parseLibraryTab
} from '../features/library/utils/tabs';
import type { StringKey } from '../i18n/translate';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE } from '../navigation/focus';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { getCardImageUrl } from '../utils/images';
import { getDisplayTitle, getEpisodeNumbers, getPlayedPercentage } from '../utils/items';
import { useOpenItem } from '../utils/navigation';

const getKey = (item: ItemDto) => item.Id ?? '';

const NEWEST_FIRST: LibraryItemsFilter = { sortBy: [ ItemSortBy.DateCreated ] };
const COLLECTION_TYPES = [ BaseItemKind.BoxSet ];
const EPISODE_TYPES = [ BaseItemKind.Episode ];

interface TabProps {
    view: ItemDto
    itemTypes: BaseItemKind[] | null
}

/** Rows of a title to resume or to watch next, then the newest titles of the library. */
const SuggestionsTab: FC<TabProps> = ({ view }) => {
    const t = useTranslation();
    const { api } = useApi();
    const openItem = useOpenItem();
    const isSeries = view.CollectionType === CollectionType.Tvshows;
    const resume = useLibraryResume(view.Id ?? undefined);
    const nextUp = useLibraryNextUp(view.Id ?? undefined, isSeries);
    const latest = useLatestInLibrary(view.Id ?? '');

    const renderCard = useCallback((shape: 'landscape' | 'portrait') => {
        const CardRenderer = (item: ItemDto) => {
            const progress = getPlayedPercentage(item);
            const numbers = getEpisodeNumbers(item);
            return (
                <PosterCard
                    title={getDisplayTitle(item)}
                    subtitle={numbers ? t('EpisodeNumber', numbers[0], numbers[1]) : undefined}
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
    }, [ api, openItem, t ]);

    const isEmpty = !resume.isPending && !latest.isPending && (!isSeries || !nextUp.isPending)
        && !resume.data?.length && !latest.data?.length && !nextUp.data?.length
        && !resume.isError && !latest.isError && !nextUp.isError;

    return (
        <>
            <MediaRow
                title={t('RowContinueWatching')}
                shape='landscape'
                items={resume.data}
                isPending={resume.isPending}
                isError={resume.isError}
                getKey={getKey}
                renderItem={renderCard('landscape')}
            />
            {isSeries && (
                <MediaRow
                    title={t('RowNextUp')}
                    shape='landscape'
                    items={nextUp.data}
                    isPending={nextUp.isPending}
                    isError={nextUp.isError}
                    getKey={getKey}
                    renderItem={renderCard('landscape')}
                />
            )}
            <MediaRow
                title={t('RowRecentlyAdded')}
                shape='portrait'
                items={latest.data}
                isPending={latest.isPending}
                isError={latest.isError}
                getKey={getKey}
                renderItem={renderCard('portrait')}
            />
            {isEmpty && <p className='pf-library__note'>{t('LibraryNoSuggestions')}</p>}
        </>
    );
};

/**
 * Episodes airing soon, with their air date in words. They are not on disk
 * yet: each tile opens the page of its series, and is a focus stop so the
 * whole list stays reachable with the arrow keys.
 */
const UpcomingTab: FC<TabProps> = ({ view }) => {
    const t = useTranslation();
    const { api } = useApi();
    const openItem = useOpenItem();
    const upcoming = useUpcomingEpisodes(view.Id ?? undefined);

    if (upcoming.isError) {
        return (
            <p className='pf-row__error' role='status'>
                <ErrorOutline aria-hidden='true' />
                {t('LibraryLoadError')}
            </p>
        );
    }
    if (upcoming.isPending) return <p className='pf-library__note' aria-busy='true'>{t('Loading')}</p>;
    if (!upcoming.data.length) return <p className='pf-library__note'>{t('LibraryNoUpcoming')}</p>;

    return (
        <ul className='pf-grid'>
            {upcoming.data.map(item => {
                const numbers = getEpisodeNumbers(item);
                // In the language of the interface; air dates are days, stored at midnight UTC
                const date = item.PremiereDate ? toLocaleDateString(new Date(item.PremiereDate), { timeZone: 'UTC' }) : undefined;
                const subtitle = [
                    numbers ? t('EpisodeNumber', numbers[0], numbers[1]) : undefined,
                    date ? t('UpcomingOn', date) : undefined
                ].filter(Boolean).join(', ');
                return (
                    <li key={item.Id ?? ''} className='pf-grid__item'>
                        <PosterCard
                            title={item.SeriesName ?? getDisplayTitle(item)}
                            subtitle={subtitle || undefined}
                            imageUrl={api ? getCardImageUrl(api, item, 'portrait') : undefined}
                            shape='portrait'
                            value={item}
                            onSelect={openItem}
                        />
                    </li>
                );
            })}
        </ul>
    );
};

interface FilterTabProps extends TabProps {
    choices: ItemDto[] | undefined
    isPending: boolean
    isError: boolean
    pickerKey: StringKey
    noChoiceKey: StringKey
    toFilter: (id: string) => LibraryItemsFilter
}

/** A row of choices (genres, networks), then the titles of the chosen one. The choice lives in the address. */
const FilterTab: FC<FilterTabProps> = ({ view, itemTypes, choices, isPending, isError, pickerKey, noChoiceKey, toFilter }) => {
    const t = useTranslation();
    const [ searchParams, setSearchParams ] = useSearchParams();
    const options = useMemo(
        // Genre and network names come from the metadata, as the server stores them
        () => (choices ?? []).filter(choice => !!choice.Id).map(choice => ({ id: choice.Id!, name: choice.Name ?? '' })),
        [ choices ]
    );
    const chosen = options.find(option => option.id === searchParams.get(LIBRARY_FILTER_PARAM)) ?? options[0];

    const onSelect = useCallback((id: string) => {
        const next = new URLSearchParams(searchParams);
        next.set(LIBRARY_FILTER_PARAM, id);
        setSearchParams(next, { replace: true });
    }, [ searchParams, setSearchParams ]);

    if (isError) {
        return (
            <p className='pf-row__error' role='status'>
                <ErrorOutline aria-hidden='true' />
                {t('LibraryLoadError')}
            </p>
        );
    }
    if (isPending) return <p className='pf-library__note' aria-busy='true'>{t('Loading')}</p>;
    if (!chosen) return <p className='pf-library__note'>{t(noChoiceKey)}</p>;

    return (
        <>
            <ChoicePicker label={t(pickerKey)} options={options} selectedId={chosen.id} onSelect={onSelect} />
            <div className='pf-library__filtered' {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}>
                <LibraryGrid parentId={view.Id ?? undefined} itemTypes={itemTypes} filter={toFilter(chosen.id)} emptyKey='LibraryEmpty' />
            </div>
        </>
    );
};

const toGenreFilter = (genreId: string): LibraryItemsFilter => ({ genreId });
const toStudioFilter = (studioId: string): LibraryItemsFilter => ({ studioId });

const GenresTab: FC<TabProps> = props => {
    const genres = useLibraryGenres(props.view.Id ?? undefined, props.itemTypes);
    return (
        <FilterTab
            {...props}
            choices={genres.data}
            isPending={genres.isPending}
            isError={genres.isError}
            pickerKey='LibraryGenrePicker'
            noChoiceKey='LibraryNoGenres'
            toFilter={toGenreFilter}
        />
    );
};

const NetworksTab: FC<TabProps> = props => {
    const studios = useLibraryStudios(props.view.Id ?? undefined);
    return (
        <FilterTab
            {...props}
            choices={studios.data}
            isPending={studios.isPending}
            isError={studios.isError}
            pickerKey='LibraryNetworkPicker'
            noChoiceKey='LibraryNoNetworks'
            toFilter={toStudioFilter}
        />
    );
};

const LibraryTabContent: FC<TabProps & { tab: LibraryTab }> = ({ tab, view, itemTypes }) => {
    const parentId = view.Id ?? undefined;
    switch (tab) {
        case LibraryTab.All:
            return <LibraryGrid parentId={parentId} itemTypes={itemTypes} emptyKey='LibraryEmpty' />;
        case LibraryTab.Suggestions:
            return <SuggestionsTab view={view} itemTypes={itemTypes} />;
        case LibraryTab.Upcoming:
            return <UpcomingTab view={view} itemTypes={itemTypes} />;
        case LibraryTab.Genres:
            return <GenresTab view={view} itemTypes={itemTypes} />;
        case LibraryTab.Networks:
            return <NetworksTab view={view} itemTypes={itemTypes} />;
        case LibraryTab.Collections:
            // Collections live in their own folder: the ones of the whole server, as upstream
            return <LibraryGrid parentId={parentId} itemTypes={COLLECTION_TYPES} filter={{ isServerWide: true }} emptyKey='LibraryNoCollections' />;
        case LibraryTab.Episodes:
            return <LibraryGrid parentId={parentId} itemTypes={EPISODE_TYPES} filter={NEWEST_FIRST} emptyKey='LibraryNoEpisodes' />;
    }
};

/**
 * One library of the server: its tabs (All, Suggestions, Genres...), as the
 * upstream library pages offer them, and its titles on disk. No catalog
 * title, no missing badge, no Download button: everything here plays right
 * away, except the announced episodes of Upcoming.
 */
export const Component = () => {
    const t = useTranslation();
    const { viewId } = useParams();
    const pageRef = useRef<HTMLDivElement>(null);
    const [ searchParams, setSearchParams ] = useSearchParams();

    const { data: userViews, isPending: isViewPending, isError: isViewError } = useUserViews();
    const view = useMemo<ItemDto | undefined>(
        () => userViews?.Items?.find(item => item.Id === viewId) as ItemDto | undefined,
        [ userViews, viewId ]
    );
    const itemTypes = view ? getViewItemTypes(view.CollectionType) : null;
    const tabs = useMemo(() => getLibraryTabs(view?.CollectionType), [ view ]);
    const tab = parseLibraryTab(searchParams.get(LIBRARY_TAB_PARAM), tabs);

    // A kind of library Pufferfin has no page for yet (live TV) goes to its upstream page, without a step in the history
    const navigate = useNavigate();
    useEffect(() => {
        if (view && itemTypes === null) {
            navigate(appRouter.getRouteUrl(view, { context: view.CollectionType }).substring(1), { replace: true });
        }
    }, [ itemTypes, navigate, view ]);

    // The tab lives in the address, so Back from a title returns to the same tab; a new tab drops the chosen genre
    const onTabSelect = useCallback((id: string) => {
        setSearchParams(id === LibraryTab.All ? {} : { [LIBRARY_TAB_PARAM]: id }, { replace: true });
    }, [ setSearchParams ]);

    const tabOptions = useMemo(() => tabs.map(id => ({ id, name: t(LIBRARY_TAB_LABELS[id]) })), [ t, tabs ]);

    useInitialFocus(pageRef, [ isViewPending ], !isViewPending);

    // An unknown library (removed, or not shared with this user) says so instead of loading forever
    const isUnknown = !isViewPending && !isViewError && !view;

    let content: React.ReactNode;
    if (isViewError) {
        // Failure is told with an icon and words, never with color alone
        content = (
            <p className='pf-row__error' role='status'>
                <ErrorOutline aria-hidden='true' />
                {t('LibraryLoadError')}
            </p>
        );
    } else if (isUnknown) {
        content = <p className='pf-library__note'>{t('LibraryNotFound')}</p>;
    } else if (isViewPending || !view) {
        content = <p className='pf-library__note' aria-busy='true'>{t('Loading')}</p>;
    } else {
        content = <LibraryTabContent tab={tab} view={view} itemTypes={itemTypes} />;
    }

    return (
        <div ref={pageRef} className='pf-library'>
            {/* Library names come from the server, as the administrator typed them */}
            <h1 className='pf-library__title'>{view?.Name ?? t('NavLibrary')}</h1>
            {view && tabs.length > 1 && (
                <ChoicePicker label={t('LibraryTabsLabel')} options={tabOptions} selectedId={tab} onSelect={onTabSelect} />
            )}
            <section className='pf-library__shelf' aria-label={t(LIBRARY_TAB_LABELS[tab])} {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}>
                {content}
            </section>
        </div>
    );
};

Component.displayName = 'PufferfinLibraryViewPage';
