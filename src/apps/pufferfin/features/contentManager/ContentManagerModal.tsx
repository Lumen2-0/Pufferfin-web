import classNames from 'classnames';
import { Film, Globe, Headphones, Search, Sparkles, Tv, X } from 'lucide-react';
import React, { type ChangeEvent, type FC, type KeyboardEvent, type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { type DeletionOutcome, TorrentAction } from 'apps/pufferfin/api/types';
import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';

import type { StringKey } from '../../i18n/translate';
import { useTranslation } from '../../i18n/useTranslation';

import { useCancelDeletion, useContentInventory, useDeleteContent, useScheduleDeletion } from './api';
import { CONTENT_FILTERS, CONTENT_SORTS, type ContentFilter, type ContentSort, daysSince, daysUntil, formatSize, selectRows } from './content';
import LibraryDropdown from '../library/components/LibraryDropdown';
import { closeContentManager, useIsContentManagerOpen } from './store';
import type { ContentCategory, ContentRow, ContentTracker } from './types';

import '../library/library.scss';
import './contentManager.scss';

const FILTER_KEYS: Record<ContentFilter, StringKey> = {
    all: 'ContentFilterAll',
    Movie: 'ContentFilterMovie',
    Series: 'ContentFilterSeries',
    Anime: 'ContentFilterAnime',
    Documentary: 'ContentFilterDocumentary',
    Audiobook: 'ContentFilterAudiobook'
};

const TYPE_KEYS: Record<ContentCategory, StringKey> = {
    Movie: 'ContentTypeMovie',
    Series: 'ContentTypeSeries',
    Anime: 'ContentTypeAnime',
    Documentary: 'ContentTypeDocumentary',
    Audiobook: 'ContentTypeAudiobook'
};

const TYPE_ICONS: Record<ContentCategory, typeof Film> = {
    Movie: Film,
    Series: Tv,
    Anime: Sparkles,
    Documentary: Globe,
    Audiobook: Headphones
};

const SORT_KEYS: Record<ContentSort, StringKey> = {
    title: 'ContentSortTitle',
    size: 'ContentSortSize',
    age: 'ContentSortAge',
    ratio: 'ContentSortRatio'
};

const TRACKER_KEYS: Record<ContentTracker, StringKey> = {
    None: 'ContentNoTorrent',
    Public: 'ContentTrackerPublic',
    Private: 'ContentTrackerPrivate',
    Mixed: 'ContentTrackerMixed',
    Unknown: 'ContentTrackerUnknown'
};

const getLocale = () => globalize.getCurrentLocale() || 'en-us';

const formatDay = (date: string, locale: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(date));

const formatRatio = (ratio: number, locale: string) => ratio.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** The days a deleted title's private torrents still seed, from the plan the server carried out. */
const getKeptDays = (outcome: DeletionOutcome | undefined, now: number) => {
    const kept = outcome?.Plan?.Torrents.filter(torrent => torrent.Action === TorrentAction.KeepUntilMinimum) ?? [];
    const days = kept.map(torrent => daysUntil(torrent.MinimumReachedAt, now) ?? 0);
    return days.length ? Math.max(1, ...days) : undefined;
};

type RowState = 'idle' | 'confirm' | 'busy' | 'failed';

interface DeletedRow {
    row: ContentRow;
    keptDays?: number;
}

interface RowProps {
    row: ContentRow;
    deleted?: DeletedRow;
    now: number;
    locale: string;
    onDeleted: (row: ContentRow, outcome: DeletionOutcome) => void;
}

/** The way around the tracker minimum, offered only to a title whose torrents are still held by it. */
const ImmediateButton: FC<{ days?: number, busy: boolean, onClick: () => void }> = ({ days, busy, onClick }) => {
    const t = useTranslation();
    return days ? <button type='button' className='pf-cm-button pf-cm-button--danger' onClick={onClick} disabled={busy}>{t('ContentConfirmImmediate')}</button> : null;
};

const ContentLine: FC<RowProps> = ({ row, deleted, now, locale, onDeleted }) => {
    const t = useTranslation();
    const [ state, setState ] = useState<RowState>('idle');
    const deleteContent = useDeleteContent();
    const scheduleDeletion = useScheduleDeletion();
    const cancelDeletion = useCancelDeletion();
    const Icon = TYPE_ICONS[row.Category];

    const ask = useCallback(() => setState('confirm'), []);
    const back = useCallback(() => setState('idle'), []);
    const remove = useCallback((immediate: boolean) => {
        setState('busy');
        deleteContent.mutate({ itemId: row.ItemId, immediate }, {
            onSuccess: outcome => onDeleted(row, outcome),
            onError: () => setState('failed')
        });
    }, [ deleteContent, onDeleted, row ]);
    const confirm = useCallback(() => remove(false), [ remove ]);
    const confirmImmediate = useCallback(() => remove(true), [ remove ]);
    const schedule = useCallback(() => {
        setState('busy');
        scheduleDeletion.mutate(row.ItemId, { onSettled: () => setState('idle') });
    }, [ row.ItemId, scheduleDeletion ]);
    const cancel = useCallback(() => {
        setState('busy');
        cancelDeletion.mutate(row.ItemId, { onSettled: () => setState('idle') });
    }, [ cancelDeletion, row.ItemId ]);

    const age = daysSince(row.AddedAt, now);
    const protectedDays = daysUntil(row.ProtectedUntil, now);
    const facts = [
        formatSize(row.SizeBytes, locale),
        age !== undefined ? t('ContentSince', age) : undefined,
        row.Torrents.length > 1 ? t('ContentTorrentCount', row.Torrents.length) : undefined
    ].filter((fact): fact is string => !!fact);

    let actions: React.ReactNode;
    if (deleted) {
        actions = <span className='pf-cm-status'>{t('ContentDeleted')}</span>;
    } else if (state === 'confirm' || (state === 'busy' && deleteContent.isPending)) {
        actions = (
            <span className='pf-cm-actions'>
                <button type='button' className='pf-cm-button pf-cm-button--danger' onClick={confirm} disabled={state === 'busy'}>{t('ContentConfirm')}</button>
                <ImmediateButton days={protectedDays} busy={state === 'busy'} onClick={confirmImmediate} />
                <button type='button' className='pf-cm-button' onClick={back} disabled={state === 'busy'}>{t('ContentCancel')}</button>
            </span>
        );
    } else if (row.DeletionDueAt) {
        actions = (
            <span className='pf-cm-actions'>
                <span className='pf-cm-status'>{t('ContentScheduledFor', formatDay(row.DeletionDueAt, locale))}</span>
                <button type='button' className='pf-cm-button' onClick={cancel} disabled={state === 'busy'}>{t('ContentCancel')}</button>
            </span>
        );
    } else {
        actions = (
            <span className='pf-cm-actions'>
                <button type='button' className='pf-cm-button' onClick={schedule} disabled={state === 'busy'}>{t('ContentDeleteLater')}</button>
                <button type='button' className='pf-cm-button pf-cm-button--danger' onClick={ask} disabled={state === 'busy'}>{t('ContentDeleteNow')}</button>
            </span>
        );
    }

    // Before the deletion, the torrent its tracker still wants; after it, the one the server actually kept
    let note: string | undefined;
    if (deleted?.keptDays) note = t('ContentKeepsSeeding', deleted.keptDays);
    else if (!deleted && state === 'confirm' && protectedDays) note = t('ContentKeepsSeeding', protectedDays);

    return (
        <li className={classNames('pf-cm-row', { 'pf-cm-row--confirm': state === 'confirm', 'pf-cm-row--deleted': !!deleted })}>
            <span className='pf-cm-row__icon' role='img' aria-label={t(TYPE_KEYS[row.Category])}>
                <Icon aria-hidden='true' focusable='false' size='1.125rem' strokeWidth={1.75} />
            </span>
            <span className='pf-cm-row__main'>
                <span className='pf-cm-row__title'>
                    {state === 'confirm' ? t('ContentConfirmDelete', row.Title) : row.Title}
                    {state !== 'confirm' && row.Year ? <span className='pf-cm-row__year'>{row.Year}</span> : null}
                </span>
                <span className='pf-cm-row__facts'>
                    {facts.join(' · ')}
                    <span className='pf-cm-tracker'>{t(TRACKER_KEYS[row.Tracker])}</span>
                </span>
                {note && <span className='pf-cm-row__note'>{note}</span>}
                {state === 'failed' && <span className='pf-cm-row__note pf-cm-row__note--error' role='alert'>{t('ContentDeleteFailed')}</span>}
            </span>
            {/* The ratio stands apart, large: the figure an admin looks for first */}
            <span className={classNames('pf-cm-ratio', { 'pf-cm-ratio--none': row.Ratio === undefined || row.Ratio === null })}>
                <span className='pf-cm-ratio__value'>{row.Ratio !== undefined && row.Ratio !== null ? formatRatio(row.Ratio, locale) : '—'}</span>
                <span className='pf-cm-ratio__label'>{t('ContentRatioLabel')}</span>
            </span>
            {actions}
        </li>
    );
};

const ContentManagerWindow: FC = () => {
    const t = useTranslation();
    const { user } = useApi();
    const isAdministrator = !!user?.Policy?.IsAdministrator;
    const { data, isPending, isError } = useContentInventory(isAdministrator);
    const [ filter, setFilter ] = useState<ContentFilter>('all');
    const [ sort, setSort ] = useState<ContentSort>('title');
    const [ search, setSearch ] = useState('');
    const [ deleted, setDeleted ] = useState<Map<string, DeletedRow>>(() => new Map());
    const dialogRef = useRef<HTMLDivElement>(null);
    const locale = getLocale();
    // Ages and days left are counted from each render: the window stays open for minutes at most
    const now = Date.now();

    useEffect(() => {
        const root = document.documentElement;
        const previous = root.style.overflow;
        root.style.overflow = 'hidden';
        dialogRef.current?.focus();
        return () => {
            root.style.overflow = previous;
        };
    }, []);

    const onKeyDown = useCallback((event: KeyboardEvent) => {
        event.stopPropagation();
        if (event.key === 'Escape' || event.key === 'GoBack' || event.key === 'BrowserBack') {
            event.preventDefault();
            closeContentManager();
        }
    }, []);
    const onBackdrop = useCallback((event: MouseEvent) => {
        if (event.target === event.currentTarget) closeContentManager();
    }, []);
    const onSearch = useCallback((event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value), []);
    const sortOptions = useMemo(() => CONTENT_SORTS.map(option => ({ id: option, label: t(SORT_KEYS[option]) })), [ t ]);
    const onDeleted = useCallback((row: ContentRow, outcome: DeletionOutcome) => {
        setDeleted(current => new Map(current).set(row.ItemId, { row, keptDays: getKeptDays(outcome, Date.now()) }));
    }, []);

    // A deleted title stays in the list, marked, until the window closes
    const rows = useMemo(() => {
        const live = (data?.Rows ?? []).filter(row => !deleted.has(row.ItemId));
        return selectRows([ ...live, ...Array.from(deleted.values(), entry => entry.row) ], filter, search, sort);
    }, [ data, deleted, filter, search, sort ]);
    const totalSize = useMemo(() => (data?.Rows ?? []).reduce((sum, row) => sum + row.SizeBytes, 0), [ data ]);

    let body: React.ReactNode;
    if (isPending) {
        body = <p className='pf-cm-note'>{t('ContentLoading')}</p>;
    } else if (isError || !data) {
        body = <p className='pf-cm-note pf-cm-note--error' role='alert'>{t('ContentLoadError')}</p>;
    } else if (!rows.length) {
        body = <p className='pf-cm-note'>{t('ContentEmpty')}</p>;
    } else {
        body = (
            <ul className='pf-cm-list'>
                {rows.map(row => (
                    <ContentLine key={row.ItemId} row={row} deleted={deleted.get(row.ItemId)} now={now} locale={locale} onDeleted={onDeleted} />
                ))}
            </ul>
        );
    }

    return (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- the backdrop closes on a click; Escape closes from the keyboard
        <div className='pf-cm' onClick={onBackdrop} onKeyDown={onKeyDown}>
            <div ref={dialogRef} className='pf-cm-dialog' role='dialog' aria-modal='true' aria-labelledby='pf-cm-title' tabIndex={-1}>
                <header className='pf-cm-header'>
                    <div className='pf-cm-header__text'>
                        <h3 id='pf-cm-title' className='pf-cm-title'>{t('MenuContentManager')}</h3>
                        {data && <span className='pf-cm-count'>{t('ContentCount', data.Rows.length, formatSize(totalSize, locale))}</span>}
                    </div>
                    <button type='button' className='pf-cm-close' aria-label={t('SettingsClose')} onClick={closeContentManager}>
                        <X aria-hidden='true' focusable='false' size='1.25rem' strokeWidth={1.75} />
                    </button>
                </header>
                <div className='pf-cm-toolbar'>
                    <label className='pf-cm-search'>
                        <span className='pf-cm-sr'>{t('ContentManagerSearch')}</span>
                        <Search className='pf-cm-search__icon' aria-hidden='true' focusable='false' size='1rem' strokeWidth={1.75} />
                        <input
                            type='search'
                            className='pf-cm-search__input'
                            placeholder={t('ContentManagerSearch')}
                            value={search}
                            onChange={onSearch}
                        />
                    </label>
                    <LibraryDropdown<ContentSort>
                        label={t('ContentSortChip', t(SORT_KEYS[sort]))}
                        ariaLabel={t('ContentSortLabel')}
                        options={sortOptions}
                        selectedId={sort}
                        onSelect={setSort}
                        align='end'
                        isLabelled={false}
                    />
                </div>
                <div className='pf-cm-chips' role='group' aria-label={t('ContentManagerFilters')}>
                    {CONTENT_FILTERS.map(option => (
                        <FilterChip key={option} option={option} isActive={filter === option} onSelect={setFilter} />
                    ))}
                </div>
                {data && !data.TorrentsAvailable && <p className='pf-cm-note'>{t('ContentTorrentsUnavailable')}</p>}
                <div className='pf-cm-body'>{body}</div>
            </div>
        </div>
    );
};

const FilterChip: FC<{ option: ContentFilter, isActive: boolean, onSelect: (option: ContentFilter) => void }> = ({ option, isActive, onSelect }) => {
    const t = useTranslation();
    const onClick = useCallback(() => onSelect(option), [ onSelect, option ]);
    return (
        <button type='button' className={classNames('pf-cm-chip', { 'pf-cm-chip--active': isActive })} aria-pressed={isActive} onClick={onClick}>
            {t(FILTER_KEYS[option])}
        </button>
    );
};

/** Mounts the content manager while it is open, over everything. */
const ContentManagerModal: FC = () => (useIsContentManagerOpen() ? createPortal(<ContentManagerWindow />, document.body) : null);

export default ContentManagerModal;
