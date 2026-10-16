import React, { type ReactNode, useCallback, useMemo, useRef } from 'react';
import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { CollectionType } from '@jellyfin/sdk/lib/generated-client/models/collection-type';
import { useSearchParams } from 'react-router-dom';

import { useUserViews } from 'hooks/api/useUserViews';
import type { ItemDto } from 'types/base/models/item-dto';

import { ErrorOutline } from '../components/icons';
import LibraryCatalog from '../features/library/components/LibraryCatalog';
import { type CatalogFilters, parseCatalogFilters, writeCatalogFilters } from '../features/library/utils/catalogFilters';
import { ALL_LIBRARY_ID, getViewItemTypes } from '../features/library/utils/library';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE } from '../navigation/focus';
import { useInitialFocus } from '../navigation/useInitialFocus';

import '../features/library/library.scss';

/** The chosen library of the page, kept in the address so Back from a title returns to it. */
const LIBRARY_PARAM = 'library';

const ALL_TYPES = [ BaseItemKind.Movie, BaseItemKind.Series ];

/** The other libraries come in the order of the server, films first, then series. */
const LIBRARY_ORDER: (string | null | undefined)[] = [ CollectionType.Movies, CollectionType.Tvshows ];
const getLibraryRank = (view: ItemDto) => {
    const rank = LIBRARY_ORDER.indexOf(view.CollectionType);
    return rank === -1 ? LIBRARY_ORDER.length : rank;
};

/**
 * The library tab: only what is on disk, plainly. Every film and series
 * together by default, or one library of the menu, in one grid with its
 * filters. No catalog title, no Download button: everything here plays right away.
 */
export const Component = () => {
    const t = useTranslation();
    const pageRef = useRef<HTMLDivElement>(null);
    const [ searchParams, setSearchParams ] = useSearchParams();

    const views = useUserViews();

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
        () => [
            { id: ALL_LIBRARY_ID, label: t('ExploreKindAll') },
            ...libraries.map(view => ({ id: view.Id!, label: view.Name ?? '' }))
        ],
        [ libraries, t ]
    );
    const chosen = libraries.find(view => view.Id === searchParams.get(LIBRARY_PARAM));
    const allView = useMemo(() => ({ Name: t('ExploreKindAll') }) as ItemDto, [ t ]);
    const filters = useMemo(() => parseCatalogFilters(searchParams), [ searchParams ]);

    // Another library starts with every filter cleared, but keeps its order
    const onSelectLibrary = useCallback((id: string) => {
        setSearchParams(previous => {
            const next = new URLSearchParams();
            if (id !== ALL_LIBRARY_ID) next.set(LIBRARY_PARAM, id);
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
    } else if (!libraries.length) {
        catalog = <p className='pf-lib__note'>{t('LibraryNoLibraries')}</p>;
    } else {
        catalog = (
            <LibraryCatalog
                key={chosen?.Id ?? ALL_LIBRARY_ID}
                view={chosen ?? allView}
                itemTypes={chosen ? getViewItemTypes(chosen.CollectionType) : ALL_TYPES}
                libraries={options}
                onSelectLibrary={onSelectLibrary}
                filters={filters}
                onFiltersChange={onFiltersChange}
            />
        );
    }

    return (
        <div ref={pageRef} className='pf-lib'>
            {/* The tab says where we are: the title is for assistive technologies only */}
            <h1 className='pf-visually-hidden'>{t('NavLibrary')}</h1>

            <div {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}>
                {catalog}
            </div>
        </div>
    );
};

Component.displayName = 'PufferfinLibraryPage';
