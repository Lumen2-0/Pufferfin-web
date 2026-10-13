import classNames from 'classnames';
import React, { type ChangeEvent, type FC, type KeyboardEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useDebounceValue } from 'usehooks-ts';

import globalize from 'lib/globalize';

import { Bone } from '../../../components/Skeleton';
import type { StringKey } from '../../../i18n/translate';
import { useTranslation } from '../../../i18n/useTranslation';
import { CatalogAvailability, type CatalogItem, CatalogItemKind } from '../../catalog/api/types';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { isSearchable } from '../utils/query';

import {
    getResultPath,
    getSpotlightSections,
    type SectionId,
    SPOTLIGHT_FILTERS,
    SpotlightFilter,
    type SpotlightLine
} from './results';
import { closeSpotlight, openSpotlight, useIsSpotlightOpen } from './store';
import { useSpotlightSearch } from './useSpotlightSearch';

import './spotlight.scss';
import { ArrowForward, Check, Mic, Search } from '../../../components/icons';

/** Results follow the typing after a short pause, so each keystroke is not a request. */
const DEBOUNCE_MS = 250;

const FILTER_LABELS: Record<SpotlightFilter, StringKey> = {
    [SpotlightFilter.All]: 'DiscoverTypeAll',
    [SpotlightFilter.Movies]: 'DiscoverTypeMovies',
    [SpotlightFilter.Series]: 'DiscoverTypeSeries',
    [SpotlightFilter.Audiobooks]: 'DiscoverTypeAudiobooks',
    [SpotlightFilter.People]: 'RowPeople'
};

const SECTION_TITLES: Record<SectionId, StringKey> = {
    library: 'SpotlightInYourLibrary',
    [SpotlightFilter.Movies]: 'RowMovies',
    [SpotlightFilter.Series]: 'RowShows',
    [SpotlightFilter.Audiobooks]: 'RowAudiobooks',
    [SpotlightFilter.People]: 'RowPeople'
};

const KIND_LABELS: Partial<Record<CatalogItemKind, StringKey>> = {
    [CatalogItemKind.Movie]: 'KindMovie',
    [CatalogItemKind.Series]: 'KindSeries',
    [CatalogItemKind.Audiobook]: 'KindAudiobook',
    [CatalogItemKind.Person]: 'KindPerson'
};

interface Section {
    id: SectionId
    lines: SpotlightLine[]
    isPending: boolean
}

interface RowProps {
    id: string
    index: number
    isActive: boolean
    /** The pointer over a line makes it the active one, as the arrows do. */
    onHover: (index: number) => void
}

const ResultRow: FC<RowProps & { item: CatalogItem, isInLibrarySection: boolean, onOpen: (item: CatalogItem) => void }> = ({
    item, isActive, isInLibrarySection, id, index, onOpen, onHover
}) => {
    const t = useTranslation();
    const onClick = useCallback(() => onOpen(item), [ item, onOpen ]);
    const onMouseMove = useCallback(() => onHover(index), [ index, onHover ]);
    const kindLabel = KIND_LABELS[item.Kind];
    // "Film · 2022": what it is, then its year; the author of a book
    const subtitle = [
        item.Kind === CatalogItemKind.Audiobook ? item.Authors?.[0] : kindLabel && t(kindLabel),
        item.Year ? String(item.Year) : undefined
    ].filter(Boolean).join(' · ');
    const isOnDisk = item.Availability === CatalogAvailability.OnDisk;

    return (
        <li role='presentation'>
            <button
                type='button'
                id={id}
                role='option'
                aria-selected={isActive}
                className={classNames('pf-spotlight__row', { 'pf-spotlight__row--active': isActive })}
                onClick={onClick}
                onMouseMove={onMouseMove}
                tabIndex={-1}
            >
                <span className={classNames('pf-spotlight__thumb', `pf-spotlight__thumb--${item.Kind.toLowerCase()}`)} aria-hidden='true'>
                    {item.ImageUrl && <img src={item.ImageUrl} alt='' loading='lazy' />}
                </span>
                <span className='pf-spotlight__text'>
                    <span className='pf-spotlight__title'>{item.Title}</span>
                    {subtitle && <span className='pf-spotlight__subtitle'>{subtitle}</span>}
                </span>
                {isActive && (
                    <span className='pf-spotlight__open' aria-hidden='true'>{t('SpotlightOpen')} ↵</span>
                )}
                {!isActive && isOnDisk && !isInLibrarySection && item.Kind !== CatalogItemKind.Person && (
                    <span className='pf-spotlight__badge'>
                        <Check fontSize='inherit' aria-hidden='true' />
                        {t('SpotlightInLibrary')}
                    </span>
                )}
            </button>
        </li>
    );
};

const MoreRow: FC<RowProps & { filter: SpotlightFilter, count: number, onSelect: (filter: SpotlightFilter) => void }> = ({
    filter, count, isActive, id, index, onSelect, onHover
}) => {
    const t = useTranslation();
    const onClick = useCallback(() => onSelect(filter), [ filter, onSelect ]);
    const onMouseMove = useCallback(() => onHover(index), [ index, onHover ]);
    return (
        <li role='presentation'>
            <button
                type='button'
                id={id}
                role='option'
                aria-selected={isActive}
                className={classNames('pf-spotlight__row', 'pf-spotlight__more', { 'pf-spotlight__row--active': isActive })}
                onClick={onClick}
                onMouseMove={onMouseMove}
                tabIndex={-1}
            >
                <span className='pf-spotlight__more-label'>{t('SpotlightSeeAll', count)}</span>
                <ArrowForward fontSize='inherit' aria-hidden='true' />
            </button>
        </li>
    );
};

const RowSkeletons: FC = () => (
    <>
        {Array.from({ length: 3 }, (_, index) => (
            <li key={index} className='pf-spotlight__row pf-spotlight__row--skeleton' aria-hidden='true'>
                <Bone className='pf-spotlight__thumb' />
                <span className='pf-spotlight__text'>
                    <Bone className='pf-bone--line' width={`${45 + index * 12}%`} />
                    <Bone className='pf-bone--line pf-bone--small' width='25%' />
                </span>
            </li>
        ))}
    </>
);

/**
 * The search, as a panel over the screen in the manner of Spotlight on a Mac:
 * one field, filters by kind, and the results as a list. Without a filter,
 * films, series, audiobooks and people each get their own section with
 * a few entries and See all; with one, the whole list of that kind. Arrows
 * move through the results, Enter opens one, Escape closes the panel.
 */
const SpotlightPanel: FC = () => {
    const t = useTranslation();
    const navigate = useNavigate();
    const listId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [ query, setQuery ] = useState('');
    const [ filter, setFilter ] = useState(SpotlightFilter.All);
    const [ activeIndex, setActiveIndex ] = useState(0);
    const [ debouncedQuery ] = useDebounceValue(query, DEBOUNCE_MS);
    const { titles, audiobooks, isActive } = useSpotlightSearch(debouncedQuery, filter);
    const voice = useVoiceSearch(globalize.getCurrentLocale() || 'en-us', setQuery);

    useEffect(() => {
        inputRef.current?.focus();
        // The page behind does not scroll while the panel is open
        const root = document.documentElement;
        const previous = root.style.overflow;
        root.style.overflow = 'hidden';
        return () => {
            root.style.overflow = previous;
        };
    }, []);

    const sections = useMemo<Section[]>(() => {
        const sources = { titles, audiobooks };
        return getSpotlightSections(filter, titles.data, audiobooks.data).map(section => {
            const source = sources[section.source];
            return { id: section.id, lines: section.lines, isPending: source.isPending && source.fetchStatus !== 'idle' };
        })
            // The section of the titles on disk shows no skeleton of its own: the kinds under it do
            .filter(section => section.id !== 'library' || section.lines.length > 0);
    }, [ audiobooks, filter, titles ]);

    const lines = useMemo(() => sections.flatMap(section => section.lines), [ sections ]);
    const isEmpty = isActive && sections.every(section => !section.isPending && !section.lines.length);

    // A new search or a new filter starts at the top of the list
    useEffect(() => setActiveIndex(0), [ debouncedQuery, filter ]);

    // The active line stays in view as the arrows move it
    useEffect(() => {
        listRef.current?.querySelector('.pf-spotlight__row--active')?.scrollIntoView({ block: 'nearest' });
    }, [ activeIndex ]);

    const onOpen = useCallback((item: CatalogItem) => {
        const path = getResultPath(item);
        if (!path) return;
        closeSpotlight();
        navigate(path);
    }, [ navigate ]);

    const onSelectFilter = useCallback((value: SpotlightFilter) => {
        setFilter(value);
        inputRef.current?.focus();
    }, []);

    const onKeyDown = useCallback((event: KeyboardEvent) => {
        // The panel handles its keys itself: the arrow navigation of the page behind stays out
        event.stopPropagation();
        const count = lines.length;
        switch (event.key) {
            case 'Escape':
            case 'GoBack':
            case 'BrowserBack':
                event.preventDefault();
                closeSpotlight();
                break;
            case 'ArrowDown':
                event.preventDefault();
                if (count) setActiveIndex(index => (index + 1) % count);
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (count) setActiveIndex(index => (index - 1 + count) % count);
                break;
            case 'Tab': {
                // Tab moves between the filters, Shift+Tab back
                event.preventDefault();
                const current = SPOTLIGHT_FILTERS.indexOf(filter);
                const step = event.shiftKey ? -1 : 1;
                setFilter(SPOTLIGHT_FILTERS[(current + step + SPOTLIGHT_FILTERS.length) % SPOTLIGHT_FILTERS.length]);
                break;
            }
            case 'Enter': {
                const line = lines[activeIndex];
                if (!line) break;
                event.preventDefault();
                if (line.type === 'result') onOpen(line.item);
                else setFilter(line.filter);
                break;
            }
            default:
                break;
        }
    }, [ activeIndex, filter, lines, onOpen ]);

    const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value), []);
    // Only a click on the dimmed page itself closes the panel, not one inside it
    const onBackdrop = useCallback((event: React.MouseEvent) => {
        if (event.target === event.currentTarget) closeSpotlight();
    }, []);

    let lineIndex = -1;
    const activeLineId = lines.length ? `${listId}-${activeIndex}` : undefined;

    return (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- the backdrop closes on a click; Escape closes from the keyboard
        <div className='pf-spotlight' onClick={onBackdrop} onKeyDown={onKeyDown}>
            <div className='pf-spotlight__panel' role='dialog' aria-modal='true' aria-label={t('SearchLabel')}>
                <label className='pf-spotlight__field'>
                    <Search className='pf-spotlight__icon' aria-hidden='true' />
                    <span className='pf-visually-hidden'>{t('SearchLabel')}</span>
                    <input
                        ref={inputRef}
                        className='pf-spotlight__input'
                        type='search'
                        value={query}
                        onChange={onChange}
                        placeholder={t('SpotlightPlaceholder')}
                        autoComplete='off'
                        spellCheck={false}
                        role='combobox'
                        aria-expanded={isActive}
                        aria-controls={listId}
                        aria-activedescendant={activeLineId}
                    />
                    {voice.isSupported && (
                        <button
                            type='button'
                            className={classNames('pf-spotlight__voice', { 'pf-spotlight__voice--listening': voice.state === 'listening' })}
                            aria-label={voice.state === 'listening' ? t('VoiceListening') : t('ActionVoiceSearch')}
                            onClick={voice.state === 'listening' ? voice.stop : voice.start}
                            tabIndex={-1}
                        >
                            <Mic fontSize='inherit' aria-hidden='true' />
                        </button>
                    )}
                    <kbd className='pf-spotlight__key'>{t('SpotlightEscapeKey')}</kbd>
                </label>

                <div className='pf-spotlight__filters' role='tablist' aria-label={t('SpotlightFilters')}>
                    {SPOTLIGHT_FILTERS.map(value => (
                        <FilterChip key={value} value={value} isSelected={value === filter} onSelect={onSelectFilter} />
                    ))}
                </div>

                <div ref={listRef} className='pf-spotlight__results' id={listId} role='listbox' aria-label={t('SearchLabel')}>
                    {!isSearchable(query) && <p className='pf-spotlight__hint'>{t('SpotlightHint')}</p>}
                    {isEmpty && <p className='pf-spotlight__hint'>{t('SearchNoResults', debouncedQuery.trim())}</p>}
                    {isActive && sections.map(section => {
                        if (!section.isPending && !section.lines.length) return null;
                        return (
                            <section key={section.id} className='pf-spotlight__section'>
                                {filter === SpotlightFilter.All && (
                                    <h3 className='pf-spotlight__section-title'>{t(SECTION_TITLES[section.id])}</h3>
                                )}
                                <ul className='pf-spotlight__list' role='presentation'>
                                    {section.isPending && !section.lines.length ? <RowSkeletons /> : section.lines.map(line => {
                                        lineIndex++;
                                        const index = lineIndex;
                                        return line.type === 'result' ? (
                                            <ResultRow
                                                key={line.item.Key}
                                                id={`${listId}-${index}`}
                                                item={line.item}
                                                isInLibrarySection={section.id === 'library'}
                                                index={index}
                                                isActive={index === activeIndex}
                                                onOpen={onOpen}
                                                onHover={setActiveIndex}
                                            />
                                        ) : (
                                            <MoreRow
                                                key={`more-${line.filter}`}
                                                id={`${listId}-${index}`}
                                                filter={line.filter}
                                                count={line.count}
                                                index={index}
                                                isActive={index === activeIndex}
                                                onSelect={onSelectFilter}
                                                onHover={setActiveIndex}
                                            />
                                        );
                                    })}
                                </ul>
                            </section>
                        );
                    })}
                </div>

                <div className='pf-spotlight__footer' aria-hidden='true'>
                    <span>{t('SpotlightHintNavigate')}</span>
                    <span>{t('SpotlightHintOpen')}</span>
                    <span>{t('SpotlightHintClose')}</span>
                </div>
            </div>
        </div>
    );
};

const FilterChip: FC<{ value: SpotlightFilter, isSelected: boolean, onSelect: (value: SpotlightFilter) => void }> = ({ value, isSelected, onSelect }) => {
    const t = useTranslation();
    const onClick = useCallback(() => onSelect(value), [ onSelect, value ]);
    return (
        <button
            type='button'
            role='tab'
            aria-selected={isSelected}
            className={classNames('pf-spotlight__chip', { 'pf-spotlight__chip--selected': isSelected })}
            onClick={onClick}
            tabIndex={-1}
        >
            {t(FILTER_LABELS[value])}
        </button>
    );
};

/**
 * Mounts the panel while it is open, over everything. ⌘K or Ctrl+K opens it
 * from anywhere, as on a Mac.
 */
const Spotlight: FC = () => {
    const isOpen = useIsSpotlightOpen();

    useEffect(() => {
        const onKey = (event: globalThis.KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                if (isOpen) closeSpotlight();
                else openSpotlight();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [ isOpen ]);

    return isOpen ? createPortal(<SpotlightPanel />, document.body) : null;
};

export default Spotlight;
