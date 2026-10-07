import ErrorOutline from '@mui/icons-material/ErrorOutline';
import ExpandMore from '@mui/icons-material/ExpandMore';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { appRouter } from 'components/router/appRouter';
import { useUserViews } from 'hooks/api/useUserViews';
import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import PosterCard from '../components/PosterCard';
import RoundButton from '../components/RoundButton';
import { useLibraryItems } from '../features/library/api/useLibraryItems';
import { getViewItemTypes } from '../features/library/utils/library';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE, FOCUSABLE_ATTRIBUTE, focusElement } from '../navigation/focus';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { getCardImageUrl } from '../utils/images';
import { getDisplayTitle, getPlayedPercentage } from '../utils/items';
import { useOpenItem } from '../utils/navigation';

/**
 * One library of the server: its titles on disk, by name, in a compact grid.
 * No catalog title, no missing badge, no Download button: everything here
 * plays right away.
 */
export const Component = () => {
    const t = useTranslation();
    const { api } = useApi();
    const openItem = useOpenItem();
    const { viewId } = useParams();
    const pageRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLUListElement>(null);

    const { data: userViews, isPending: isViewPending, isError: isViewError } = useUserViews();
    const view = useMemo<ItemDto | undefined>(
        () => userViews?.Items?.find(item => item.Id === viewId) as ItemDto | undefined,
        [ userViews, viewId ]
    );
    const itemTypes = view ? getViewItemTypes(view.CollectionType) : null;

    // A kind of library Pufferfin has no page for yet (live TV) goes to its upstream page, without a step in the history
    const navigate = useNavigate();
    useEffect(() => {
        if (view && itemTypes === null) {
            navigate(appRouter.getRouteUrl(view, { context: view.CollectionType }).substring(1), { replace: true });
        }
    }, [ itemTypes, navigate, view ]);

    const {
        data,
        isPending,
        isError,
        hasNextPage,
        isFetchingNextPage,
        isFetchNextPageError,
        fetchNextPage
    } = useLibraryItems(view?.Id ?? undefined, itemTypes);
    const items = useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [ data ]);

    useInitialFocus(pageRef, [ items.length ], !isPending);

    // After Show more, the focus goes to the first new title: the button may be gone, and the focus must not be lost.
    // The library is kept with the index, so a page that lands after a library change does not pull the focus.
    const pendingFocus = useRef<{ viewId: string | undefined, index: number }>();
    const onShowMore = useCallback(() => {
        // Not disabled while loading: a disabled button would drop the focus
        if (isFetchingNextPage) return;
        pendingFocus.current = { viewId, index: items.length };
        fetchNextPage().catch(() => undefined);
    }, [ fetchNextPage, isFetchingNextPage, items.length, viewId ]);

    useEffect(() => {
        const pending = pendingFocus.current;
        if (!pending) return;
        if (pending.viewId !== viewId) {
            pendingFocus.current = undefined;
            return;
        }
        if (items.length <= pending.index) return;
        pendingFocus.current = undefined;
        const target = gridRef.current?.querySelectorAll<HTMLElement>(`[${FOCUSABLE_ATTRIBUTE}]`)[pending.index];
        if (target) focusElement(target);
    }, [ items.length, viewId ]);

    // An unknown library (removed, or not shared with this user) says so instead of loading forever
    const isUnknown = !isViewPending && !isViewError && !view;

    let content: React.ReactNode;
    if (isViewError || isError) {
        // Failure is told with an icon and words, never with color alone
        content = (
            <p className='pf-row__error' role='status'>
                <ErrorOutline aria-hidden='true' />
                {t('LibraryLoadError')}
            </p>
        );
    } else if (isUnknown) {
        content = <p className='pf-library__note'>{t('LibraryNotFound')}</p>;
    } else if (isViewPending || isPending) {
        content = <p className='pf-library__note' aria-busy='true'>{t('Loading')}</p>;
    } else if (!items.length) {
        content = <p className='pf-library__note'>{t('LibraryEmpty')}</p>;
    } else {
        content = (
            <>
                <ul ref={gridRef} className='pf-grid'>
                    {items.map(item => {
                        const progress = getPlayedPercentage(item);
                        return (
                            <li key={item.Id ?? ''} className='pf-grid__item'>
                                <PosterCard
                                    title={getDisplayTitle(item)}
                                    subtitle={item.ProductionYear ? String(item.ProductionYear) : undefined}
                                    imageUrl={api ? getCardImageUrl(api, item, 'portrait') : undefined}
                                    shape='portrait'
                                    progress={progress}
                                    progressLabel={progress ? t('WatchedPercent', progress) : undefined}
                                    value={item}
                                    onSelect={openItem}
                                />
                            </li>
                        );
                    })}
                </ul>
                {isFetchNextPageError && (
                    <p className='pf-row__error' role='status'>
                        <ErrorOutline aria-hidden='true' />
                        {t('LibraryLoadError')}
                    </p>
                )}
                {hasNextPage && (
                    <div className='pf-library__more'>
                        <RoundButton
                            icon={<ExpandMore />}
                            label={isFetchingNextPage ? t('Loading') : t('ActionShowMore')}
                            onClick={onShowMore}
                        />
                    </div>
                )}
            </>
        );
    }

    return (
        <div ref={pageRef} className='pf-library'>
            {/* Library names come from the server, as the administrator typed them */}
            <h1 className='pf-library__title'>{view?.Name ?? t('NavLibrary')}</h1>
            <section
                className='pf-library__shelf'
                aria-busy={isViewPending || isPending || isFetchingNextPage}
                {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}
            >
                {content}
            </section>
        </div>
    );
};

Component.displayName = 'PufferfinLibraryViewPage';
