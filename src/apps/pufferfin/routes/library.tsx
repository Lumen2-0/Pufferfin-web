import React, { type FC, useCallback, useMemo, useRef } from 'react';

import { useUserViews } from 'hooks/api/useUserViews';
import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import MediaRow from '../components/MediaRow';
import PosterCard from '../components/PosterCard';
import { useNextUpItems, useResumeItems } from '../features/home/api/useHomeRows';
import { useLatestInLibrary, useResumeAudioItems } from '../features/library/api/useLibraryItems';
import { hasLatestRow, isAudiobookEntry } from '../features/library/utils/library';
import type { StringKey } from '../i18n/translate';
import { useTranslation } from '../i18n/useTranslation';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { type CardShape, getCardImageUrl } from '../utils/images';
import { getDisplayTitle, getEpisodeNumbers, getPlayedPercentage } from '../utils/items';
import { useOpenItem, useOpenLibrary } from '../utils/navigation';
import { isPlayableItem } from '../utils/playback';
import { usePlayItem } from '../utils/usePlay';

const getKey = (item: ItemDto) => item.Id ?? '';

/** Authors of a book, under its cover. */
const getBookAuthors = (item: ItemDto) => (isAudiobookEntry(item) ? item.AlbumArtist ?? undefined : undefined);

/** Card renderers of the library rows: a title or a book opens its page. */
function useCardRenderer(shape: CardShape, onSelect: (item: ItemDto) => void, progressKey: StringKey = 'WatchedPercent') {
    const t = useTranslation();
    const { api } = useApi();
    const playCard = usePlayItem();

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
                onSelect={onSelect}
                onPlay={isPlayableItem(item) ? playCard : undefined}
            />
        );
    }, [ api, onSelect, playCard, progressKey, shape, t ]);
}

const LatestRow: FC<{ view: ItemDto }> = ({ view }) => {
    const t = useTranslation();
    const openItem = useOpenItem();
    const renderCard = useCardRenderer('portrait', openItem);
    const latest = useLatestInLibrary(view);
    return (
        <MediaRow
            // Library names come from the server, as the administrator typed them
            title={t('RowLatestIn', view.Name ?? '')}
            shape='portrait'
            items={latest.data}
            isPending={latest.isPending}
            isError={latest.isError}
            getKey={getKey}
            renderItem={renderCard}
        />
    );
};

/**
 * The library tab: the former Jellyfin home, only what is on disk. The
 * libraries of the server, what to resume, what comes next, and the newest
 * titles of each library. No catalog title, no missing badge, no Download
 * button: everything here plays right away.
 */
export const Component = () => {
    const t = useTranslation();
    const { user } = useApi();
    const pageRef = useRef<HTMLDivElement>(null);
    const openItem = useOpenItem();
    const openLibrary = useOpenLibrary();

    const views = useUserViews();
    const resume = useResumeItems();
    const resumeAudio = useResumeAudioItems();
    const nextUp = useNextUpItems();

    const libraries = useMemo(
        () => ((views.data?.Items ?? []) as ItemDto[]).filter(view => !!view.Id),
        [ views.data ]
    );
    // The libraries the user left out of their home in the upstream settings stay out of here too
    const latestViews = useMemo(() => {
        const excluded = user?.Configuration?.LatestItemsExcludes ?? [];
        return libraries.filter(view => hasLatestRow(view, excluded));
    }, [ libraries, user ]);

    const renderLibrary = useCardRenderer('landscape', openLibrary);
    const renderResume = useCardRenderer('landscape', openItem);
    // A book opens its page, with every part of it and Resume
    const renderAudio = useCardRenderer('portrait', openItem, 'ListenedPercent');

    // The focus starts on the first library, which comes first on the page
    useInitialFocus(pageRef, [ views.isPending ], !views.isPending);

    const isEmpty = !views.isPending && !views.isError && !libraries.length;

    return (
        <div ref={pageRef} className='pf-library pf-library--home'>
            {/* The tab says where we are: the title is for assistive technologies only */}
            <h1 className='pf-visually-hidden'>{t('NavLibrary')}</h1>

            <MediaRow
                title={t('RowMyMedia')}
                shape='landscape'
                items={libraries}
                isPending={views.isPending}
                isError={views.isError}
                getKey={getKey}
                renderItem={renderLibrary}
            />
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
            <MediaRow
                title={t('RowNextUp')}
                shape='landscape'
                items={nextUp.data}
                isPending={nextUp.isPending}
                isError={nextUp.isError}
                getKey={getKey}
                renderItem={renderResume}
            />
            {latestViews.map(view => <LatestRow key={view.Id} view={view} />)}

            {isEmpty && <p className='pf-library__note'>{t('LibraryNoLibraries')}</p>}
        </div>
    );
};

Component.displayName = 'PufferfinLibraryPage';
