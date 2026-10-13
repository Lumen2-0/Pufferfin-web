import { describe, expect, it } from 'vitest';

import { groupStateKey, initials, isLastingStatus, nudgeOffset, statusForAction, statusForGroupState } from './model';

describe('initials', () => {
    it('takes the first letters of two words', () => {
        expect(initials('mo gd')).toBe('MG');
        expect(initials('Eredesboi')).toBe('E');
        expect(initials('  ')).toBe('');
    });
});

describe('groupStateKey', () => {
    it('names the state, and why the group waits', () => {
        expect(groupStateKey('Playing')).toBe('SyncPlayStatePlaying');
        expect(groupStateKey('Waiting', 'Buffer')).toBe('SyncPlayStateBuffering');
        expect(groupStateKey('Waiting', 'Seek')).toBe('SyncPlayStateSyncing');
        expect(groupStateKey('Waiting', 'Ready')).toBe('SyncPlayStateWaitingOthers');
        expect(groupStateKey(null)).toBeUndefined();
    });
});

describe('statusForGroupState', () => {
    it('tells the waits, and clears once the group is ready in pause', () => {
        expect(statusForGroupState('Waiting', 'Buffer')).toBe('buffering');
        expect(statusForGroupState('Waiting', 'Unpause')).toBe('waiting');
        expect(statusForGroupState('Playing', 'Ready')).toBe('starting');
        expect(statusForGroupState('Paused', 'Ready')).toBeNull();
        expect(statusForGroupState('Idle', 'Stop')).toBeUndefined();
    });
});

describe('statusForAction', () => {
    it('maps the actions of the player, and clears on anything else', () => {
        expect(statusForAction('wait-pause')).toBe('waiting');
        expect(statusForAction('pause')).toBe('paused');
        expect(statusForAction('clear')).toBeNull();
    });

    it('lets a pause or a restart pass, and keeps the waits on screen', () => {
        expect(isLastingStatus('paused')).toBe(false);
        expect(isLastingStatus('playing')).toBe(false);
        expect(isLastingStatus('buffering')).toBe(true);
    });
});

describe('nudgeOffset', () => {
    it('moves by a step and stays within a second', () => {
        expect(nudgeOffset(0, 20)).toBe(20);
        expect(nudgeOffset(990, 20)).toBe(1000);
        expect(nudgeOffset(-995, -20)).toBe(-1000);
        expect(nudgeOffset(Number.NaN, -20)).toBe(-20);
    });
});
