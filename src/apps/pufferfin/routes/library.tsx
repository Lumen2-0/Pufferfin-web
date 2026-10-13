import React, { type FC, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useUserViews } from 'hooks/api/useUserViews';
import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import ChoicePicker from '../components/ChoicePicker';
import MediaRow from '../components/MediaRow';
import PosterCard from '../components/PosterCard';
import { GridSkeleton } from '../components/Skeleton';
import { ErrorOutline } from '../components/icons';
import { useDismissResume, useResumeItems } from '../features/home/api/useHomeRows';
import { useResumeAudioItems } from '../features/library/api/useLibraryItems';
import LibraryGrid from '../features/library/components/LibraryGrid';
import { getViewItemTypes, isAudiobookEntry } from '../features/library/utils/library';
import type { StringKey } from '../i18n/translate';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE } from '../navigation/focus';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { type CardShape, getCardImageUrl } from '../utils/images';
import { getDisplayTitle, getEpisodeNumbers, getPlayedPercentage } from '../utils/items';
import { useOpenItem } from '../utils/navigation';
import { isPlayableItem } from '../utils/playback';
import { usePlayItem } from '../utils/usePlay';

const getKey = (item: ItemDto) => item.Id ?? '';

/** The chosen library of the page, kept in the address so Back from a title returns to it. */
const LIBRARY_PARAM = 'library';

/** Authors of a book, under its cover. */
const getBookAuthors = (item: ItemDto) => (isAudiobookEntry(item) ? item.AlbumArtist ?? undefined : undefined);

/** Cards of what is being watched or listened to: a title opens its page, a cross stops watching it. */
function useResumeCardRenderer(shape: CardShape, progressKey: StringKey) {
    const t = useTranslation();
    const { api } = useApi();
    const openItem = useOpenItem();
    const playCard = usePlayItem();
    const dismiss = useDismissResume();
    const onDismiss = useCallback((item: ItemDto) => {
        if (item.Id) dismiss.mutate(item.Id);
    }, [ dismiss ]);

    return useCallback((item: ItemDto) => {
        const progress = getPlayedPercentage(item);
        const numbers = getEpisodeNumbers(item);
        return (
            <PosterCard
                title={getDisplayTitle(item)}
                subtitle={numbers ? t('EpisodeNumber', numbers[0], numbers[1]) : getBookAuthors(item)}
                imageUrl={api ? getCardImageUrl(api, item, shape) : undefined}
                shape={shape}
                progress={progress}
                progressLabel={progress ? t(progressKey, progress) : undefined}
                value={item}
                onSelect={openItem}
                onPlay={isPlayableItem(item) ? playCard : undefined}
                onDismiss={onDismiss}
                dismissLabel={t('ActionStopWatching')}
            />
        );
    }, [ api, onDismiss, openItem, playCard, progressKey, shape, t ]);
}

/** Every title of one library, in one grid. */
const LibraryShelf: FC<{ view: ItemDto }> = ({ view }) => (
    <LibraryGrid parentId={view.Id ?? undefined} itemTypes={getViewItemTypes(view.CollectionType)} emptyKey='LibraryEmpty' />
);

/**
 * The library tab: only what is on disk, plainly. What is being watched or
 * listened to, then every title of the chosen library in one grid. No
 * catalog title, no Download button: everything here plays right away.
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
        () => ((views.data?.Items ?? []) as ItemDto[]).filter(view => !!view.Id && getViewItemTypes(view.CollectionType) !== null),
        [ views.data ]
    );
    const options = useMemo(
        // Library names come from the server, as the administrator typed them
        () => libraries.map(view => ({ id: view.Id!, name: view.Name ?? '' })),
        [ libraries ]
    );
    const chosen = libraries.find(view => view.Id === searchParams.get(LIBRARY_PARAM)) ?? libraries[0];

    const onSelect = useCallback((id: string) => {
        setSearchParams({ [LIBRARY_PARAM]: id }, { replace: true });
    }, [ setSearchParams ]);

    const renderResume = useResumeCardRenderer('landscape', 'WatchedPercent');
    // A book opens its page, with every part of it and Resume
    const renderAudio = useResumeCardRenderer('portrait', 'ListenedPercent');

    useInitialFocus(pageRef, [ views.isPending ], !views.isPending);

    let shelf: React.ReactNode;
    if (views.isError) {
        // Failure is told with an icon and words, never with color alone
        shelf = (
            <p className='pf-row__error' role='status'>
                <ErrorOutline aria-hidden='true' />
                {t('LibraryLoadError')}
            </p>
        );
    } else if (views.isPending) {
        shelf = <GridSkeleton />;
    } else if (!chosen) {
        shelf = <p className='pf-library__note'>{t('LibraryNoLibraries')}</p>;
    } else {
        shelf = <LibraryShelf key={chosen.Id} view={chosen} />;
    }

    return (
        <div ref={pageRef} className='pf-library pf-library--home'>
            {/* The tab says where we are: the title is for assistive technologies only */}
            <h1 className='pf-visually-hidden'>{t('NavLibrary')}</h1>

            <MediaRow
                title={t('RowContinueWatching')}
                shape='landscape'
                items={resume.data}
                isPending={resume.isPending}
                isError={resume.isError}
                getKey={getKey}
                renderItem={renderResume}
            />
            <MediaRow
                title={t('RowContinueListening')}
                shape='portrait'
                items={resumeAudio.data}
                isPending={resumeAudio.isPending}
                isError={resumeAudio.isError}
                getKey={getKey}
                renderItem={renderAudio}
            />

            <section className='pf-library__all' aria-label={chosen?.Name ?? t('NavLibrary')}>
                {options.length > 1 && (
                    <ChoicePicker label={t('LibraryPicker')} options={options} selectedId={chosen?.Id ?? undefined} onSelect={onSelect} />
                )}
                <div className='pf-library__shelf' {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}>
                    {shelf}
                </div>
            </section>
        </div>
    );
};

Component.displayName = 'PufferfinLibraryPage';
