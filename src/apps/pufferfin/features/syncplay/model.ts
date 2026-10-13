import type { StringKey } from '../../i18n/translate';

/** The first letters of a name, for a round avatar without a picture. */
export const initials = (name: string) => name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]!.toUpperCase())
    .join('');

/** What the group is doing, in words: the state of the server, and why it waits. */
export function groupStateKey(state?: string | null, reason?: string | null): StringKey | undefined {
    switch (state) {
        case 'Idle':
            return 'SyncPlayStateIdle';
        case 'Paused':
            return 'SyncPlayStatePaused';
        case 'Playing':
            return 'SyncPlayStatePlaying';
        case 'Waiting':
            if (reason === 'Buffer') return 'SyncPlayStateBuffering';
            if (reason === 'Seek') return 'SyncPlayStateSyncing';
            return 'SyncPlayStateWaitingOthers';
        default:
            return undefined;
    }
}

/** The quiet status shown over the picture while the group gets in step. */
export type PlayerStatus = 'starting' | 'waiting' | 'buffering' | 'syncing' | 'paused' | 'playing';

/** How long a passing status stays: a pause or a restart is told, then goes. */
export const PASSING_STATUS_MS = 1600;

/** Whether a status stays until the next one: waits do, a pause or a restart passes. */
export const isLastingStatus = (status: PlayerStatus) => status !== 'paused' && status !== 'playing';

/**
 * The status over the picture for a change of the group state, or undefined
 * when there is nothing to tell (the group is ready and plays on).
 */
export function statusForGroupState(state: string, reason: string): PlayerStatus | null | undefined {
    if (state === 'Playing' && (reason === 'Unpause' || reason === 'Ready')) return 'starting';
    if (state === 'Paused' && reason === 'Pause') return 'paused';
    if (state === 'Paused' && reason === 'Ready') return null;
    if (state === 'Waiting' && reason === 'Seek') return 'syncing';
    if (state === 'Waiting' && reason === 'Buffer') return 'buffering';
    if (state === 'Waiting' && (reason === 'Pause' || reason === 'Unpause')) return 'waiting';
    return undefined;
}

/** The status over the picture for an action of the SyncPlay player. */
export function statusForAction(action: string): PlayerStatus | null {
    switch (action) {
        case 'schedule-play':
            return 'starting';
        case 'unpause':
            return 'playing';
        case 'pause':
            return 'paused';
        case 'seek':
            return 'syncing';
        case 'buffering':
            return 'buffering';
        case 'wait-pause':
        case 'wait-unpause':
            return 'waiting';
        default:
            return null;
    }
}

const STATUS_KEYS: Record<PlayerStatus, StringKey> = {
    starting: 'SyncPlayStatusStarting',
    waiting: 'SyncPlayStateWaitingOthers',
    buffering: 'SyncPlayStateBuffering',
    syncing: 'SyncPlayStateSyncing',
    paused: 'SyncPlayStatePaused',
    playing: 'SyncPlayStatePlaying'
};

export const statusKey = (status: PlayerStatus): StringKey => STATUS_KEYS[status];

/** The extra time offset, nudged by a step and kept within a sane second either way. */
export function nudgeOffset(current: number, step: number): number {
    const next = Math.round((Number.isFinite(current) ? current : 0) + step);
    return Math.max(-1000, Math.min(1000, next));
}
