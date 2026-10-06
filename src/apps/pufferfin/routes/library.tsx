import ErrorOutline from '@mui/icons-material/ErrorOutline';
import ExpandMore from '@mui/icons-material/ExpandMore';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useApi } from 'hooks/useApi';

import ChoicePicker from '../components/ChoicePicker';
import PosterCard from '../components/PosterCard';
import RoundButton from '../components/RoundButton';
import { useLibraryItems } from '../features/library/api/useLibraryItems';
import { LIBRARY_KINDS, type LibraryKind, parseLibraryKind } from '../features/library/utils/library';
import { type StringKey } from '../i18n/translate';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE, FOCUSABLE_ATTRIBUTE, focusElement } from '../navigation/focus';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { getCardImageUrl } from '../utils/images';
import { getDisplayTitle, getPlayedPercentage } from '../utils/items';
import { useOpenItem } from '../utils/navigation';

const KIND_PARAM = 'type';

const KIND_LABELS: Record<LibraryKind, StringKey> = {
    movies: 'LibraryMovies',
    shows: 'LibraryShows'
};

const EMPTY_MESSAGES: Record<LibraryKind, StringKey> = {
    movies: 'LibraryNoMovies',
    shows: 'LibraryNoShows'
};

/**
 * The library tab: only what is on disk, so everything here plays right away.
 * No catalog title, no missing badge, no Download button: those belong to the home screen.
 */
export const Component = () => {
    const t = useTranslation();
    const { api } = useApi();
    const openItem = useOpenItem();
    const pageRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLUListElement>(null);

    // The shelf lives in the URL, so Back from a title comes back to the same shelf
    const [ searchParams, setSearchParams ] = useSearchParams();
    const kind = parseLibraryKind(searchParams.get(KIND_PARAM));
    const onKindSelect = useCallback((id: string) => {
        setSearchParams({ [KIND_PARAM]: parseLibraryKind(id) }, { replace: true });
    }, [ setSearchParams ]);

    const {
        data,
        isPending,
        isError,
        hasNextPage,
        isFetchingNextPage,
        isFetchNextPageError,
        fetchNextPage
    } = useLibraryItems(kind);
    const items = useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [ data ]);

    useInitialFocus(pageRef, []);

    // After Show more, the focus goes to the first new title: the button may be gone, and the focus must not be lost.
    // The shelf is kept with the index, so a page that lands after a shelf change does not pull the focus.
    const pendingFocus = useRef<{ kind: LibraryKind, index: number }>();
    const onShowMore = useCallback(() => {
        // Not disabled while loading: a disabled button would drop the focus
        if (isFetchingNextPage) return;
        pendingFocus.current = { kind, index: items.length };
        fetchNextPage().catch(() => undefined);
    }, [ fetchNextPage, isFetchingNextPage, items.length, kind ]);

    useEffect(() => {
        const pending = pendingFocus.current;
        if (!pending) return;
        if (pending.kind !== kind) {
            pendingFocus.current = undefined;
            return;
        }
        if (items.length <= pending.index) return;
        pendingFocus.current = undefined;
        const target = gridRef.current?.querySelectorAll<HTMLElement>(`[${FOCUSABLE_ATTRIBUTE}]`)[pending.index];
        if (target) focusElement(target);
    }, [ items.length, kind ]);

    const kindOptions = useMemo(
        () => LIBRARY_KINDS.map(id => ({ id, name: t(KIND_LABELS[id]) })),
        [ t ]
    );

    let content: React.ReactNode;
    if (isPending) {
        content = <p className='pf-library__note' aria-busy='true'>{t('Loading')}</p>;
    } else if (isError) {
        // Failure is told with an icon and words, never with color alone
        content = (
            <p className='pf-row__error' role='status'>
                <ErrorOutline aria-hidden='true' />
                {t('LibraryLoadError')}
            </p>
        );
    } else if (!items.length) {
        content = <p className='pf-library__note'>{t(EMPTY_MESSAGES[kind])}</p>;
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
            <h1 className='pf-library__title'>{t('NavLibrary')}</h1>
            <ChoicePicker
                label={t('LibraryShelfLabel')}
                options={kindOptions}
                selectedId={kind}
                onSelect={onKindSelect}
            />
            <section
                className='pf-library__shelf'
                aria-label={t(KIND_LABELS[kind])}
                aria-busy={isPending || isFetchingNextPage}
                {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}
            >
                {content}
            </section>
        </div>
    );
};

Component.displayName = 'PufferfinLibraryPage';
