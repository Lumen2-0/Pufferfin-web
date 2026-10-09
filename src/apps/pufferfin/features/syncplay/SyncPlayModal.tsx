import type { GroupInfoDto } from '@jellyfin/sdk/lib/generated-client/models/group-info-dto';
import { SyncPlayUserAccessType } from '@jellyfin/sdk/lib/generated-client/models/sync-play-user-access-type';
import classNames from 'classnames';
import React, { type FC, type FormEvent, type KeyboardEvent, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { useCreateSyncPlayGroup } from 'apps/modern/features/syncPlay/hooks/api/useCreateSyncPlayGroup';
import { useJoinSyncPlayGroup } from 'apps/modern/features/syncPlay/hooks/api/useJoinSyncPlayGroup';
import { useLeaveSyncPlayGroup } from 'apps/modern/features/syncPlay/hooks/api/useLeaveSyncPlayGroup';
import { useSyncPlayGroups } from 'apps/modern/features/syncPlay/hooks/api/useSyncPlayGroups';
import { useSyncPlay } from 'apps/modern/features/syncPlay/hooks/useSyncPlay';
import { useApi } from 'hooks/useApi';
import { setSetting } from 'plugins/syncPlay/core/Settings';
import Events from 'utils/events';

import { Close, ExpandMore, Groups, PlayArrow } from '../../components/icons';
import type { StringKey } from '../../i18n/translate';
import { useTranslation } from '../../i18n/useTranslation';
import { FormNote, SettingRow, SettingsButton, Switch, TextField } from '../settings/components/fields';

import '../settings/settings.scss';
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

const STATE_LABELS: Record<string, StringKey> = {
    Idle: 'SyncPlayStateIdle',
    Waiting: 'SyncPlayStateWaiting',
    Paused: 'SyncPlayStatePaused',
    Playing: 'SyncPlayStatePlaying'
};

/** The first letters of a name, for a round avatar without a picture. */
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]!.toUpperCase()).join('');

const Avatars: FC<{ names: string[] }> = ({ names }) => (
    <span className='pf-syncplay__avatars' aria-hidden='true'>
        {names.slice(0, 4).map(name => <span key={name} className='pf-syncplay__avatar'>{initials(name)}</span>)}
        {names.length > 4 && <span className='pf-syncplay__avatar pf-syncplay__avatar--more'>+{names.length - 4}</span>}
    </span>
);

const StateBadge: FC<{ state?: string | null }> = ({ state }) => {
    const t = useTranslation();
    const label = state ? STATE_LABELS[state] : undefined;
    if (!label) return null;
    return <span className={classNames('pf-syncplay__state', `pf-syncplay__state--${state!.toLowerCase()}`)}>{t(label)}</span>;
};

const GroupCard: FC<{ group: GroupInfoDto, onJoin: (groupId: string) => void, isBusy: boolean }> = ({ group, onJoin, isBusy }) => {
    const t = useTranslation();
    const onClick = useCallback(() => {
        if (group.GroupId) onJoin(group.GroupId);
    }, [ group.GroupId, onJoin ]);
    const names = group.Participants ?? [];
    return (
        <li className='pf-syncplay__group'>
            <Avatars names={names} />
            <span className='pf-syncplay__group-text'>
                <span className='pf-syncplay__group-name'>{group.GroupName}</span>
                <span className='pf-syncplay__group-people'>{names.join(', ')}</span>
            </span>
            <StateBadge state={group.State} />
            <SettingsButton variant='primary' onClick={onClick} disabled={isBusy}>{t('SyncPlayJoin')}</SettingsButton>
        </li>
    );
};

/** Numbers of the synchronisation, in milliseconds, saved as the upstream editor saves them. */
const NumberSetting: FC<{ label: string, description?: string, name: string, value: number | undefined }> = ({ label, description, name, value }) => {
    const [ text, setText ] = useState(value === undefined ? '' : String(value));
    const onBlur = useCallback(() => {
        const number = Number(text);
        if (text !== '' && Number.isFinite(number)) setSetting(name, number);
    }, [ name, text ]);
    return (
        <SettingRow label={label} description={description}>
            <span className='pf-syncplay__number'>
                <TextField value={text} onChange={setText} onBlur={onBlur} label={label} />
                <span>ms</span>
            </span>
        </SettingRow>
    );
};

interface PlaybackCore {
    enableSyncCorrection?: boolean
    useSpeedToSync?: boolean
    useSkipToSync?: boolean
    minDelaySpeedToSync?: number
    maxDelaySpeedToSync?: number
    speedToSyncDuration?: number
    minDelaySkipToSync?: number
}

interface ManagerWithCores {
    playbackCore?: PlaybackCore
    timeSyncCore?: { extraTimeOffset?: number }
}

const SyncSwitch: FC<{ label: string, description?: string, name: string, initial: boolean, manager: object }> = ({ label, description, name, initial, manager }) => {
    const [ checked, setChecked ] = useState(initial);
    const onChange = useCallback((value: boolean) => {
        setChecked(value);
        setSetting(name, value);
        Events.trigger(manager, 'settings-update');
    }, [ manager, name ]);
    return (
        <SettingRow label={label} description={description}>
            <Switch label={label} checked={checked} onChange={onChange} />
        </SettingRow>
    );
};

/** How the group keeps in step: the switches first, the fine timings folded away. */
const SyncSettings: FC<{ manager: object }> = ({ manager }) => {
    const t = useTranslation();
    const [ isOpenDetails, setIsOpenDetails ] = useState(false);
    const toggle = useCallback(() => setIsOpenDetails(value => !value), []);
    const cores = manager as ManagerWithCores;
    const playback = cores.playbackCore ?? {};

    return (
        <section className='pf-syncplay__settings'>
            <button type='button' className='pf-syncplay__disclosure' aria-expanded={isOpenDetails} onClick={toggle}>
                <span>{t('SyncPlaySyncSettings')}</span>
                <ExpandMore className='pf-syncplay__chevron' fontSize='inherit' aria-hidden='true' />
            </button>
            {isOpenDetails && (
                <div className='pf-syncplay__settings-body'>
                    <SyncSwitch label={t('SyncPlaySyncCorrection')} description={t('SyncPlaySyncCorrectionHint')} name='enableSyncCorrection' initial={playback.enableSyncCorrection !== false} manager={manager} />
                    <SyncSwitch label={t('SyncPlaySpeedToSync')} description={t('SyncPlaySpeedToSyncHint')} name='useSpeedToSync' initial={playback.useSpeedToSync !== false} manager={manager} />
                    <SyncSwitch label={t('SyncPlaySkipToSync')} description={t('SyncPlaySkipToSyncHint')} name='useSkipToSync' initial={playback.useSkipToSync !== false} manager={manager} />
                    <NumberSetting label={t('SyncPlayExtraOffset')} description={t('SyncPlayExtraOffsetHint')} name='extraTimeOffset' value={cores.timeSyncCore?.extraTimeOffset} />
                    <NumberSetting label={t('SyncPlayMinDelaySpeed')} name='minDelaySpeedToSync' value={playback.minDelaySpeedToSync} />
                    <NumberSetting label={t('SyncPlayMaxDelaySpeed')} name='maxDelaySpeedToSync' value={playback.maxDelaySpeedToSync} />
                    <NumberSetting label={t('SyncPlaySpeedDuration')} name='speedToSyncDuration' value={playback.speedToSyncDuration} />
                    <NumberSetting label={t('SyncPlayMinDelaySkip')} name='minDelaySkipToSync' value={playback.minDelaySkipToSync} />
                </div>
            )}
        </section>
    );
};

/**
 * SyncPlay, as a window in the style of the settings: to watch together.
 * Outside a group, the groups to join, each with its people and what it is
 * doing, and a group to create. Inside one, its people, what it is doing,
 * starting or stopping the playback of the group, leaving it, and how it
 * keeps in step.
 */
const SyncPlayPanel: FC = () => {
    const t = useTranslation();
    const { __legacyApiClient__, user } = useApi();
    const { isActive, currentGroup, syncPlay } = useSyncPlay();
    const { data: groups, isPending } = useSyncPlayGroups();
    const create = useCreateSyncPlayGroup();
    const join = useJoinSyncPlayGroup();
    const leave = useLeaveSyncPlayGroup();
    const [ name, setName ] = useState(() => t('SyncPlayDefaultName', user?.Name ?? ''));
    const canCreate = user?.Policy?.SyncPlayAccess === SyncPlayUserAccessType.CreateAndJoinGroups;

    useEffect(() => {
        const root = document.documentElement;
        const previous = root.style.overflow;
        root.style.overflow = 'hidden';
        return () => {
            root.style.overflow = previous;
        };
    }, []);

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

    const onJoin = useCallback((groupId: string) => join.mutate({ joinGroupRequestDto: { GroupId: groupId } }), [ join ]);
    const onCreate = useCallback((event: FormEvent) => {
        event.preventDefault();
        create.mutate({ newGroupRequestDto: { GroupName: name.trim() || t('SyncPlayDefaultName', user?.Name ?? '') } });
    }, [ create, name, t, user?.Name ]);
    const onLeave = useCallback(() => leave.mutate(undefined), [ leave ]);
    const onResume = useCallback(() => {
        if (__legacyApiClient__) syncPlay?.Manager.resumeGroupPlayback(__legacyApiClient__);
    }, [ __legacyApiClient__, syncPlay ]);
    const onHalt = useCallback(() => {
        if (__legacyApiClient__) syncPlay?.Manager.haltGroupPlayback(__legacyApiClient__);
    }, [ __legacyApiClient__, syncPlay ]);

    const isPlaying = !!syncPlay?.Manager.isPlaybackActive();
    const hasQueue = !!syncPlay && !syncPlay.Manager.isPlaylistEmpty();

    let body: React.ReactNode;
    if (isActive && currentGroup) {
        const people = currentGroup.Participants ?? [];
        body = (
            <>
                <div className='pf-syncplay__current'>
                    <div className='pf-syncplay__current-head'>
                        <span className='pf-syncplay__current-name'>{currentGroup.GroupName}</span>
                        <StateBadge state={currentGroup.State} />
                    </div>
                    <ul className='pf-syncplay__people'>
                        {people.map(person => (
                            <li key={person} className='pf-syncplay__person'>
                                <span className='pf-syncplay__avatar pf-syncplay__person-avatar'>{initials(person)}</span>
                                <span>{person}</span>
                                {person === user?.Name && <span className='pf-syncplay__you'>{t('SyncPlayYou')}</span>}
                            </li>
                        ))}
                    </ul>
                    <div className='pf-syncplay__actions'>
                        {isPlaying && <SettingsButton onClick={onHalt}>{t('SyncPlayHalt')}</SettingsButton>}
                        {!isPlaying && hasQueue && (
                            <SettingsButton variant='primary' onClick={onResume}>
                                <PlayArrow className='pf-syncplay__button-icon' fontSize='inherit' aria-hidden='true' />
                                {t('SyncPlayResume')}
                            </SettingsButton>
                        )}
                        <SettingsButton onClick={onLeave} disabled={leave.isPending}>{t('SyncPlayLeave')}</SettingsButton>
                    </div>
                    {!isPlaying && !hasQueue && <p className='pf-syncplay__hint'>{t('SyncPlayStartHint')}</p>}
                </div>
                {syncPlay && <SyncSettings manager={syncPlay.Manager} />}
            </>
        );
    } else {
        body = (
            <>
                <p className='pf-syncplay__intro'>{t('SyncPlayIntro')}</p>
                <h4 className='pf-syncplay__heading'>{t('SyncPlayGroups')}</h4>
                {!isPending && !groups?.length && <p className='pf-syncplay__empty'>{t('SyncPlayNoGroups')}</p>}
                {!!groups?.length && (
                    <ul className='pf-syncplay__groups'>
                        {groups.map(group => <GroupCard key={group.GroupId} group={group} onJoin={onJoin} isBusy={join.isPending} />)}
                    </ul>
                )}
                {canCreate && (
                    <form className='pf-syncplay__create' onSubmit={onCreate}>
                        <h4 className='pf-syncplay__heading'>{t('SyncPlayNewGroup')}</h4>
                        <div className='pf-inline-form'>
                            <TextField value={name} onChange={setName} label={t('SyncPlayGroupName')} />
                            <SettingsButton type='submit' variant='primary' disabled={create.isPending}>{t('SyncPlayCreate')}</SettingsButton>
                        </div>
                    </form>
                )}
                {(create.isError || join.isError) && <FormNote tone='error'>{t('SyncPlayError')}</FormNote>}
            </>
        );
    }

    return (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- the backdrop closes on a click; Escape closes from the keyboard
        <div className='pf-settings' onClick={onBackdrop} onKeyDown={onKeyDown}>
            <div className='pf-settings__panel pf-syncplay' role='dialog' aria-modal='true' aria-labelledby='pf-syncplay-title'>
                <header className='pf-settings__header'>
                    <span className='pf-syncplay__icon' aria-hidden='true'><Groups fontSize='inherit' /></span>
                    <h3 id='pf-syncplay-title' className='pf-settings__section-title'>{t('SyncPlayTitle')}</h3>
                    <button type='button' className='pf-settings__close' aria-label={t('SettingsClose')} onClick={closeSyncPlay}>
                        <Close fontSize='inherit' aria-hidden='true' />
                    </button>
                </header>
                <div className='pf-settings__body'>{body}</div>
            </div>
        </div>
    );
};

/** Mounts the SyncPlay window while it is open, over everything. */
const SyncPlayModal: FC = () => (useIsSyncPlayOpen() ? createPortal(<SyncPlayPanel />, document.body) : null);

export default SyncPlayModal;
