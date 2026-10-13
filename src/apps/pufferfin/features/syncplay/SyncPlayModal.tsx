import type { GroupInfoDto } from '@jellyfin/sdk/lib/generated-client/models/group-info-dto';
import { SyncPlayUserAccessType } from '@jellyfin/sdk/lib/generated-client/models/sync-play-user-access-type';
import classNames from 'classnames';
import React, { type FC, type FormEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { useSyncPlayGroups } from 'apps/modern/features/syncPlay/hooks/api/useSyncPlayGroups';
import { useApi } from 'hooks/useApi';

import { Close, ExpandMore } from '../../components/icons';
import { useTranslation } from '../../i18n/useTranslation';

import { createGroup, followAgain, getSyncSettings, joinGroup, leaveGroup, setSyncSetting, stopForMe, type SyncSettings } from './actions';
import { groupStateKey, initials, nudgeOffset } from './model';
import { getSyncPlayManager, type SyncPlaySnapshot, syncPlayStore } from './syncPlayStore';

import './syncplay.scss';

// One window for the whole interface, opened from the bar
let isOpen = false;
const listeners = new Set<() => void>();
const setOpen = (value: boolean) => {
    isOpen = value;
    listeners.forEach(listener => {
        listener();
    });
};
export const openSyncPlay = () => setOpen(true);
export const closeSyncPlay = () => setOpen(false);
const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};
export const useIsSyncPlayOpen = () => useSyncExternalStore(subscribe, () => isOpen);

const OFFSET_STEP_MS = 20;

const Avatar: FC<{ name: string }> = ({ name }) => (
    <span className='pf-spm-avatar' aria-hidden='true'>{initials(name)}</span>
);

const StateChip: FC<{ state?: string | null, reason?: string }> = ({ state, reason }) => {
    const t = useTranslation();
    const key = groupStateKey(state, reason);
    if (!key) return null;
    return <span className={classNames('pf-spm-chip', { 'pf-spm-chip--live': state === 'Playing' })}>{t(key)}</span>;
};

const GroupRow: FC<{ group: GroupInfoDto, onJoin: (groupId: string) => void, isBusy: boolean }> = ({ group, onJoin, isBusy }) => {
    const t = useTranslation();
    const onClick = useCallback(() => {
        if (group.GroupId) onJoin(group.GroupId);
    }, [ group.GroupId, onJoin ]);
    const people = group.Participants ?? [];
    return (
        <li>
            <button type='button' className='pf-spm-group' onClick={onClick} disabled={isBusy}>
                <span className='pf-spm-faces'>
                    {people.slice(0, 3).map(person => <Avatar key={person} name={person} />)}
                </span>
                <span className='pf-spm-group__text'>
                    <span className='pf-spm-group__name'>{group.GroupName}</span>
                    <span className='pf-spm-group__people'>{people.join(', ')}</span>
                </span>
                <StateChip state={group.State} />
                <span className='pf-spm-join'>{t('SyncPlayJoin')}</span>
            </button>
        </li>
    );
};

const SwitchRow: FC<{ label: string, hint?: string, checked: boolean, onChange: (checked: boolean) => void }> = ({ label, hint, checked, onChange }) => {
    const onClick = useCallback(() => onChange(!checked), [ checked, onChange ]);
    return (
        <button type='button' role='switch' aria-checked={checked} className='pf-spm-row pf-spm-row--switch' onClick={onClick}>
            <span className='pf-spm-row__text'>
                <span className='pf-spm-row__label'>{label}</span>
                {hint && <span className='pf-spm-row__hint'>{hint}</span>}
            </span>
            <span className='pf-spm-switch' aria-hidden='true' />
        </button>
    );
};

/** How the group keeps in step: the switches, then the offset in steps. */
const SyncSettingsSection: FC = () => {
    const t = useTranslation();
    const [ isExpanded, setIsExpanded ] = useState(false);
    const [ settings, setSettings ] = useState<SyncSettings>(getSyncSettings);
    const toggle = useCallback(() => setIsExpanded(value => !value), []);

    const change = useCallback((name: keyof SyncSettings, value: boolean | number) => {
        setSyncSetting(name, value);
        setSettings(current => ({ ...current, [name]: value }));
    }, []);
    const onCorrection = useCallback((value: boolean) => change('enableSyncCorrection', value), [ change ]);
    const onSpeed = useCallback((value: boolean) => change('useSpeedToSync', value), [ change ]);
    const onSkip = useCallback((value: boolean) => change('useSkipToSync', value), [ change ]);
    const onEarlier = useCallback(() => change('extraTimeOffset', nudgeOffset(settings.extraTimeOffset, -OFFSET_STEP_MS)), [ change, settings.extraTimeOffset ]);
    const onLater = useCallback(() => change('extraTimeOffset', nudgeOffset(settings.extraTimeOffset, OFFSET_STEP_MS)), [ change, settings.extraTimeOffset ]);

    return (
        <section className='pf-spm-settings'>
            <button type='button' className='pf-spm-disclosure' aria-expanded={isExpanded} onClick={toggle}>
                <span>{t('SyncPlaySyncSettings')}</span>
                <ExpandMore className='pf-spm-disclosure__chevron' fontSize='inherit' aria-hidden='true' />
            </button>
            {isExpanded && (
                <div className='pf-spm-settings__body'>
                    <SwitchRow label={t('SyncPlaySyncCorrection')} hint={t('SyncPlaySyncCorrectionHint')} checked={settings.enableSyncCorrection} onChange={onCorrection} />
                    <SwitchRow label={t('SyncPlaySpeedToSync')} hint={t('SyncPlaySpeedToSyncHint')} checked={settings.useSpeedToSync} onChange={onSpeed} />
                    <SwitchRow label={t('SyncPlaySkipToSync')} hint={t('SyncPlaySkipToSyncHint')} checked={settings.useSkipToSync} onChange={onSkip} />
                    <div className='pf-spm-row pf-spm-row--static'>
                        <span className='pf-spm-row__text'>
                            <span className='pf-spm-row__label'>{t('SyncPlayExtraOffset')}</span>
                            <span className='pf-spm-row__hint'>{t('SyncPlayExtraOffsetHint')}</span>
                        </span>
                        <span className='pf-spm-stepper'>
                            <button type='button' className='pf-spm-stepper__button' aria-label={t('SyncPlayOffsetEarlier')} onClick={onEarlier}>−</button>
                            <span className='pf-spm-stepper__value'>{t('SyncPlayMs', settings.extraTimeOffset)}</span>
                            <button type='button' className='pf-spm-stepper__button' aria-label={t('SyncPlayOffsetLater')} onClick={onLater}>+</button>
                        </span>
                    </div>
                </div>
            )}
        </section>
    );
};

/** In a group: its name and what it does, its people, then playing together or not, and leaving. */
const CurrentGroup: FC<{ snapshot: SyncPlaySnapshot, userName?: string | null, run: (action: () => Promise<void> | void) => void, isBusy: boolean }> = ({ snapshot, userName, run, isBusy }) => {
    const t = useTranslation();
    const group = snapshot.group!;
    const manager = getSyncPlayManager();
    const isPlaying = !!manager?.isPlaybackActive();
    const hasQueue = !!manager && !manager.isPlaylistEmpty();

    const onResume = useCallback(() => run(followAgain), [ run ]);
    const onStop = useCallback(() => run(stopForMe), [ run ]);
    const onLeave = useCallback(() => run(leaveGroup), [ run ]);

    return (
        <>
            <div className='pf-spm-current'>
                <div className='pf-spm-current__head'>
                    <span className='pf-spm-current__name'>{group.GroupName}</span>
                    <StateChip state={snapshot.state ?? group.State} reason={snapshot.reason} />
                </div>
                <h4 className='pf-spm-heading'>{t('SyncPlayMembers')}</h4>
                <ul className='pf-spm-people'>
                    {(group.Participants ?? []).map(person => (
                        <li key={person} className='pf-spm-person'>
                            <Avatar name={person} />
                            <span className='pf-spm-person__name'>{person}</span>
                            {person === userName && <span className='pf-spm-person__you'>{t('SyncPlayYou')}</span>}
                        </li>
                    ))}
                </ul>
                {!snapshot.isFollowing && <p className='pf-spm-note'>{t('SyncPlayNotFollowing')}</p>}
                {snapshot.isFollowing && !isPlaying && !hasQueue && <p className='pf-spm-note'>{t('SyncPlayStartHint')}</p>}
                <div className='pf-spm-actions'>
                    {(!snapshot.isFollowing || (!isPlaying && hasQueue)) && (
                        <button type='button' className='pf-spm-button pf-spm-button--primary' onClick={onResume} disabled={isBusy}>
                            {t('SyncPlayResume')}
                        </button>
                    )}
                    {snapshot.isFollowing && isPlaying && (
                        <button type='button' className='pf-spm-button' onClick={onStop} disabled={isBusy}>{t('SyncPlayStopForMe')}</button>
                    )}
                    <button type='button' className='pf-spm-button' onClick={onLeave} disabled={isBusy}>{t('SyncPlayLeave')}</button>
                </div>
            </div>
            <SyncSettingsSection />
        </>
    );
};

/**
 * SyncPlay, as a window in the style of the panels: to watch together.
 * Outside a group, the groups to join, each with its people and what it is
 * doing, and a group to create. Inside one, its people, what it is doing,
 * playing along or not, leaving it, and how it keeps in step.
 */
const SyncPlayWindow: FC = () => {
    const t = useTranslation();
    const { user } = useApi();
    const snapshot = useSyncExternalStore(syncPlayStore.subscribe, syncPlayStore.getSnapshot);
    const { data: groups, isPending, refetch } = useSyncPlayGroups();
    const [ name, setName ] = useState(() => t('SyncPlayDefaultName', user?.Name ?? ''));
    const [ isBusy, setIsBusy ] = useState(false);
    const [ hasError, setHasError ] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);
    const canCreate = user?.Policy?.SyncPlayAccess === SyncPlayUserAccessType.CreateAndJoinGroups;

    useEffect(() => {
        const root = document.documentElement;
        const previous = root.style.overflow;
        root.style.overflow = 'hidden';
        dialogRef.current?.focus();
        void refetch();
        return () => {
            root.style.overflow = previous;
        };
    }, [ refetch ]);

    const run = useCallback((action: () => Promise<void> | void) => {
        if (isBusy) return;
        setIsBusy(true);
        setHasError(false);
        Promise.resolve()
            .then(action)
            .catch((error: unknown) => {
                console.error('[Pufferfin] SyncPlay action failed', error);
                setHasError(true);
            })
            .finally(() => setIsBusy(false));
    }, [ isBusy ]);

    const onKeyDown = useCallback((event: KeyboardEvent) => {
        event.stopPropagation();
        if (event.key === 'Escape' || event.key === 'GoBack' || event.key === 'BrowserBack') {
            event.preventDefault();
            closeSyncPlay();
        }
    }, []);
    const onBackdrop = useCallback((event: React.MouseEvent) => {
        if (event.target === event.currentTarget) closeSyncPlay();
    }, []);

    const onJoin = useCallback((groupId: string) => run(() => joinGroup(groupId)), [ run ]);
    const onCreate = useCallback((event: FormEvent) => {
        event.preventDefault();
        run(() => createGroup(name.trim() || t('SyncPlayDefaultName', user?.Name ?? '')));
    }, [ name, run, t, user?.Name ]);
    const onNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value), []);

    let body: React.ReactNode;
    if (snapshot.group) {
        body = <CurrentGroup snapshot={snapshot} userName={user?.Name} run={run} isBusy={isBusy} />;
    } else {
        body = (
            <>
                <p className='pf-spm-note'>{t('SyncPlayIntro')}</p>
                <h4 className='pf-spm-heading'>{t('SyncPlayGroups')}</h4>
                {isPending && <p className='pf-spm-note'>{t('SyncPlayLoadingGroups')}</p>}
                {!isPending && !groups?.length && <p className='pf-spm-note'>{t('SyncPlayNoGroups')}</p>}
                {!!groups?.length && (
                    <ul className='pf-spm-groups'>
                        {groups.map(group => <GroupRow key={group.GroupId} group={group} onJoin={onJoin} isBusy={isBusy} />)}
                    </ul>
                )}
                {canCreate && (
                    <form className='pf-spm-create' onSubmit={onCreate}>
                        <h4 className='pf-spm-heading'>{t('SyncPlayNewGroup')}</h4>
                        <div className='pf-spm-create__row'>
                            <label className='pf-spm-field'>
                                <span className='pf-spm-sr'>{t('SyncPlayGroupName')}</span>
                                <input className='pf-spm-input' value={name} onChange={onNameChange} maxLength={64} />
                            </label>
                            <button type='submit' className='pf-spm-button pf-spm-button--primary' disabled={isBusy}>{t('SyncPlayCreate')}</button>
                        </div>
                    </form>
                )}
            </>
        );
    }

    return (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- the backdrop closes on a click; Escape closes from the keyboard
        <div className='pf-spm' onClick={onBackdrop} onKeyDown={onKeyDown}>
            <div ref={dialogRef} className='pf-spm-dialog' role='dialog' aria-modal='true' aria-labelledby='pf-spm-title' tabIndex={-1}>
                <header className='pf-spm-dialog__header'>
                    <h3 id='pf-spm-title' className='pf-spm-dialog__title'>{t('SyncPlayTitle')}</h3>
                    <button type='button' className='pf-spm-close' aria-label={t('SettingsClose')} onClick={closeSyncPlay}>
                        <Close fontSize='inherit' aria-hidden='true' />
                    </button>
                </header>
                <div className='pf-spm-dialog__body'>
                    {body}
                    {hasError && <p className='pf-spm-note pf-spm-note--error' role='alert'>{t('SyncPlayError')}</p>}
                </div>
            </div>
        </div>
    );
};

/** Mounts the SyncPlay window while it is open, over everything. */
const SyncPlayModal: FC = () => (useIsSyncPlayOpen() ? createPortal(<SyncPlayWindow />, document.body) : null);

export default SyncPlayModal;
