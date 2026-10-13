import React, { type FC, type ReactNode, useCallback, useMemo, useRef } from 'react';
import { CollectionType } from '@jellyfin/sdk/lib/generated-client/models/collection-type';
import { useSearchParams } from 'react-router-dom';

import { useUserViews } from 'hooks/api/useUserViews';
import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { Bone, SkeletonRegion } from '../components/Skeleton';
import { ErrorOutline } from '../components/icons';
import { useDismissResume, useResumeItems } from '../features/home/api/useHomeRows';
import { useResumeAudioItems } from '../features/library/api/useLibraryItems';
import { ResumeCard } from '../features/library/components/LibraryCards';
import LibraryCatalog from '../features/library/components/LibraryCatalog';
import { type CatalogFilters, parseCatalogFilters, writeCatalogFilters } from '../features/library/utils/catalogFilters';
import { getViewItemTypes, isAudiobookEntry } from '../features/library/utils/library';
import type { StringKey } from '../i18n/translate';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE } from '../navigation/focus';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { getCardImageUrl } from '../utils/images';
import { getDisplayTitle, getEpisodeNumbers, getPlayedPercentage } from '../utils/items';
import { usePlayItem } from '../utils/usePlay';

import '../features/library/library.scss';

const getKey = (item: ItemDto) => item.Id ?? '';

/** The chosen library of the page, kept in the address so Back from a title returns to it. */
const LIBRARY_PARAM = 'library';

/** Films first, then series, then the other libraries in the order of the server. */
const LIBRARY_ORDER: (string | null | undefined)[] = [ CollectionType.Movies, CollectionType.Tvshows ];
const getLibraryRank = (view: ItemDto) => {
    const rank = LIBRARY_ORDER.indexOf(view.CollectionType);
    return rank === -1 ? LIBRARY_ORDER.length : rank;
};

/** Authors of a book, under its cover. */
const getBookAuthors = (item: ItemDto) => (isAudiobookEntry(item) ? item.AlbumArtist ?? undefined : undefined);

const SKELETON_CARDS = 4;

/** What is being watched or listened to, in wide cards: a card plays right away, a cross stops watching it. */
const ResumeRow: FC<{ title: string, items: ItemDto[] | undefined, isPending: boolean, progressKey: StringKey }> = ({
    title, items, isPending, progressKey
}) => {
    const t = useTranslation();
    const { api } = useApi();
    const playItem = usePlayItem();
    const dismiss = useDismissResume();
    const onDismiss = useCallback((item: ItemDto) => {
        if (item.Id) dismiss.mutate(item.Id);
    }, [ dismiss ]);

    // An empty row is noise: it simply does not show
    if (!isPending && !items?.length) return null;

    let content: ReactNode;
    if (isPending) {
        content = (
            <SkeletonRegion>
                <div className='pf-lib-resume-row__list'>
                    {Array.from({ length: SKELETON_CARDS }, (_, index) => (
                        <Bone key={index} className='pf-lib-skeleton pf-lib-skeleton--resume' />
                    ))}
                </div>
            </SkeletonRegion>
        );
    } else {
        content = (
            <ul className='pf-lib-resume-row__list'>
                {items?.map(item => {
                    const progress = getPlayedPercentage(item);
                    const numbers = getEpisodeNumbers(item);
                    return (
                        <li key={getKey(item)}>
                            <ResumeCard
                                item={item}
                                title={item.SeriesName && numbers ? item.SeriesName : getDisplayTitle(item)}
                                subtitle={numbers ? t('EpisodeNumber', numbers[0], numbers[1]) : getBookAuthors(item)}
                                imageUrl={api ? getCardImageUrl(api, item, 'landscape') : undefined}
                                isSquare={isAudiobookEntry(item)}
                                progress={progress}
                                progressLabel={progress ? t(progressKey, progress) : undefined}
                                onPlay={playItem}
                                dismissLabel={t('ActionStopWatching')}
                                onDismiss={onDismiss}
                            />
                        </li>
                    );
                })}
            </ul>
        );
    }

    return (
        <section className='pf-lib-resume-row' aria-label={title} {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}>
            <h2 className='pf-lib__heading'>{title}</h2>
            {content}
        </section>
    );
};

/**
 * The library tab: only what is on disk, plainly. What is being watched or
 * listened to, then every title of the chosen library in one grid with its
 * filters. No catalog title, no Download button: everything here plays right away.
 */
export const Component = () => {
    const t = useTranslation();
    const pageRef = useRef<HTMLDivElement>(null);
    const [ searchParams, setSearchParams ] = useSearchParams();

    const views = useUserViews();
    const resume = useResumeItems();
    const resumeAudio = useResumeAudioItems();

    // The libraries Pufferfin shows a grid for; live TV keeps its upstream page
    const libraries = useMemo(
        () => ((views.data?.Items ?? []) as ItemDto[])
            .filter(view => !!view.Id && getViewItemTypes(view.CollectionType) !== null)
            // A stable sort: the libraries of the same rank keep the order of the server
            .sort((a, b) => getLibraryRank(a) - getLibraryRank(b)),
        [ views.data ]
    );
    const options = useMemo(
        // Library names come from the server, as the administrator typed them
        () => libraries.map(view => ({ id: view.Id!, label: view.Name ?? '' })),
        [ libraries ]
    );
    const chosen = libraries.find(view => view.Id === searchParams.get(LIBRARY_PARAM)) ?? libraries[0];
    const filters = useMemo(() => parseCatalogFilters(searchParams), [ searchParams ]);

    // Another library starts with every filter cleared, but keeps its order
    const onSelectLibrary = useCallback((id: string) => {
        setSearchParams(previous => {
            const next = new URLSearchParams();
            next.set(LIBRARY_PARAM, id);
            const sort = parseCatalogFilters(previous).sort;
            return writeCatalogFilters(next, { sort, isUnplayed: false, query: '' });
        }, { replace: true });
    }, [ setSearchParams ]);
    const onFiltersChange = useCallback((next: CatalogFilters) => {
        setSearchParams(previous => writeCatalogFilters(previous, next), { replace: true });
    }, [ setSearchParams ]);

    useInitialFocus(pageRef, [ views.isPending ], !views.isPending);

    let catalog: ReactNode;
    if (views.isError) {
        // Failure is told with an icon and words, never with color alone
        catalog = (
            <p className='pf-row__error' role='status'>
                <ErrorOutline aria-hidden='true' />
                {t('LibraryLoadError')}
            </p>
        );
    } else if (views.isPending) {
        catalog = null;
    } else if (!chosen) {
        catalog = <p className='pf-lib__note'>{t('LibraryNoLibraries')}</p>;
    } else {
        catalog = (
            <LibraryCatalog
                key={chosen.Id}
                view={chosen}
                itemTypes={getViewItemTypes(chosen.CollectionType)}
                libraries={options}
                onSelectLibrary={onSelectLibrary}
                filters={filters}
                onFiltersChange={onFiltersChange}
            />
        );
    }

    const hasResume = resume.isPending || !!resume.data?.length || resumeAudio.isPending || !!resumeAudio.data?.length;

    return (
        <div ref={pageRef} className='pf-lib'>
            {/* The tab says where we are: the title is for assistive technologies only */}
            <h1 className='pf-visually-hidden'>{t('NavLibrary')}</h1>

            <ResumeRow title={t('RowContinueWatching')} items={resume.data} isPending={resume.isPending} progressKey='WatchedPercent' />
            <ResumeRow title={t('RowContinueListening')} items={resumeAudio.data} isPending={resumeAudio.isPending} progressKey='ListenedPercent' />
            {hasResume && <hr className='pf-lib__rule' />}

            <div {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}>
                {catalog}
            </div>
        </div>
    );
};

Component.displayName = 'PufferfinLibraryPage';
