import Mic from '@mui/icons-material/Mic';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Search from '@mui/icons-material/Search';
import React, { type ChangeEvent, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounceValue } from 'usehooks-ts';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';
import { ItemKind } from 'types/base/models/item-kind';

import MediaRow from '../components/MediaRow';
import PersonCard from '../components/PersonCard';
import PosterCard from '../components/PosterCard';
import RoundButton from '../components/RoundButton';
import { usePeopleSearch, useTitleSearch } from '../features/search/api/useSearch';
import { useVoiceSearch } from '../features/search/hooks/useVoiceSearch';
import { isSearchable, normalizeQuery } from '../features/search/utils/query';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { getCardImageUrl } from '../utils/images';
import { getDisplayTitle } from '../utils/items';
import { useOpenItem, useOpenPerson } from '../utils/navigation';
import { playTitle } from '../utils/playback';

/** Results follow the typing after a short pause, so each keystroke is not a request. */
const DEBOUNCE_MS = 300;
const QUERY_PARAM = 'q';

const getKey = (item: ItemDto) => item.Id ?? '';

export const Component = () => {
    const t = useTranslation();
    const { api, user } = useApi();
    const openItem = useOpenItem();
    const openPerson = useOpenPerson();
    const pageRef = useRef<HTMLDivElement>(null);

    // The query lives in the URL, so Back from a result comes back to the same search
    const [ searchParams, setSearchParams ] = useSearchParams();
    const query = searchParams.get(QUERY_PARAM) ?? '';
    const setQuery = useCallback((value: string) => {
        setSearchParams(value ? { [QUERY_PARAM]: value } : {}, { replace: true });
    }, [ setSearchParams ]);

    const [ debouncedQuery ] = useDebounceValue(query, DEBOUNCE_MS);
    const titles = useTitleSearch(debouncedQuery);
    const people = usePeopleSearch(debouncedQuery);

    const voice = useVoiceSearch(globalize.getCurrentLocale() || 'en-us', setQuery);

    useInitialFocus(pageRef, []);

    const movies = useMemo(() => titles.data?.filter(item => item.Type === ItemKind.Movie), [ titles.data ]);
    const shows = useMemo(() => titles.data?.filter(item => item.Type === ItemKind.Series), [ titles.data ]);

    const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
    }, [ setQuery ]);

    const onPlayTitle = useCallback((item: ItemDto) => {
        if (api && user?.Id) {
            playTitle(api, user.Id, item).catch(() => undefined);
        }
    }, [ api, user?.Id ]);

    const renderTitle = useCallback((item: ItemDto) => {
        const title = getDisplayTitle(item);
        return (
            <div className='pf-result'>
                <PosterCard
                    title={title}
                    subtitle={item.ProductionYear ? String(item.ProductionYear) : undefined}
                    imageUrl={api ? getCardImageUrl(api, item, 'portrait') : undefined}
                    shape='portrait'
                    value={item}
                    onSelect={openItem}
                />
                <span className='pf-result__action'>
                    <RoundButton
                        icon={<PlayArrow />}
                        ariaLabel={t('ActionPlayTitle', title)}
                        value={item}
                        onClick={onPlayTitle}
                    />
                </span>
            </div>
        );
    }, [ api, onPlayTitle, openItem, t ]);

    const renderPerson = useCallback((person: ItemDto) => (
        <PersonCard
            name={person.Name ?? ''}
            imageUrl={api ? getCardImageUrl(api, person, 'portrait') : undefined}
            value={person.Id}
            onSelect={openPerson}
        />
    ), [ api, openPerson ]);

    const isActive = isSearchable(debouncedQuery);
    const isLoading = isActive && (titles.isFetching || people.isFetching);
    const hasResults = !!titles.data?.length || !!people.data?.length;

    // One live message for screen readers; it never carries a state by itself visually either
    let status: string | undefined;
    if (voice.state === 'listening') {
        status = t('VoiceListening');
    } else if (voice.state === 'error') {
        status = t('VoiceError');
    } else if (!isSearchable(query)) {
        status = t('SearchHint');
    } else if (isLoading && !hasResults) {
        status = t('Loading');
    } else if (isActive && !isLoading && !hasResults && !titles.isError && !people.isError) {
        status = t('SearchNoResults', normalizeQuery(debouncedQuery));
    }

    return (
        <div ref={pageRef} className='pf-search'>
            <div className='pf-search__bar'>
                <label className='pf-search__field'>
                    <Search className='pf-search__icon' aria-hidden='true' />
                    <span className='pf-visually-hidden'>{t('SearchLabel')}</span>
                    <input
                        className='pf-search__input'
                        type='search'
                        value={query}
                        onChange={onChange}
                        placeholder={t('SearchPlaceholder')}
                        autoComplete='off'
                        spellCheck={false}
                        {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                    />
                </label>
                {voice.isSupported && (
                    <span className='pf-search__voice'>
                        <RoundButton
                            icon={<Mic />}
                            label={voice.state === 'listening' ? t('VoiceListening') : undefined}
                            ariaLabel={t('ActionVoiceSearch')}
                            onClick={voice.state === 'listening' ? voice.stop : voice.start}
                        />
                    </span>
                )}
            </div>

            <p className='pf-search__status' role='status' aria-live='polite'>{status}</p>

            {isActive && (
                <>
                    <MediaRow
                        title={t('RowMovies')}
                        shape='portrait'
                        items={movies}
                        isPending={titles.isPending}
                        isError={titles.isError}
                        getKey={getKey}
                        renderItem={renderTitle}
                    />
                    <MediaRow
                        title={t('RowShows')}
                        shape='portrait'
                        items={shows}
                        isPending={titles.isPending}
                        isError={titles.isError}
                        getKey={getKey}
                        renderItem={renderTitle}
                    />
                    <MediaRow
                        title={t('RowPeople')}
                        shape='portrait'
                        items={people.data}
                        isPending={people.isPending}
                        isError={people.isError}
                        getKey={getKey}
                        renderItem={renderPerson}
                    />
                </>
            )}
        </div>
    );
};

Component.displayName = 'PufferfinSearchPage';
