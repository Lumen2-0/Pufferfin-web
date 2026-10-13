import { describe, expect, it } from 'vitest';

import {
    formatPlaybackRate,
    formatRunningTime,
    getChapterAt,
    getChapterMarkers,
    getEpisodeState,
    getMinutes,
    getMinutesLeft,
    getProgressPercent
} from './model';

const SECOND = 10_000_000;
const MINUTE = 60 * SECOND;

describe('formatRunningTime', () => {
    it('writes minutes and seconds under an hour', () => {
        expect(formatRunningTime(0)).toBe('0:00');
        expect(formatRunningTime(5 * SECOND)).toBe('0:05');
        expect(formatRunningTime(23 * MINUTE + 59 * SECOND)).toBe('23:59');
    });

    it('adds the hours past an hour', () => {
        expect(formatRunningTime(62 * MINUTE + 3 * SECOND)).toBe('1:02:03');
    });

    it('reads nothing or a negative time as 0:00', () => {
        expect(formatRunningTime(undefined)).toBe('0:00');
        expect(formatRunningTime(-SECOND)).toBe('0:00');
    });
});

describe('minutes and progress', () => {
    it('rounds the minutes left up', () => {
        expect(getMinutesLeft(42 * MINUTE, 21 * MINUTE)).toBe(21);
        expect(getMinutesLeft(42 * MINUTE, 41 * MINUTE + 50 * SECOND)).toBe(1);
        expect(getMinutesLeft(42 * MINUTE, 43 * MINUTE)).toBe(0);
    });

    it('gives a length at least one minute when there is one', () => {
        expect(getMinutes(42 * MINUTE + 10 * SECOND)).toBe(42);
        expect(getMinutes(20 * SECOND)).toBe(1);
        expect(getMinutes(0)).toBe(0);
    });

    it('keeps the progress inside the bar', () => {
        expect(getProgressPercent(21 * MINUTE, 42 * MINUTE)).toBe(50);
        expect(getProgressPercent(50 * MINUTE, 42 * MINUTE)).toBe(100);
        expect(getProgressPercent(10, 0)).toBe(0);
    });
});

describe('chapters', () => {
    const chapters = [
        { Name: 'Début', StartPositionTicks: 0 },
        { Name: 'Chapitre 2', StartPositionTicks: 10 * MINUTE },
        { Name: 'Chapitre 3', StartPositionTicks: 30 * MINUTE },
        { Name: 'Après la fin', StartPositionTicks: 50 * MINUTE }
    ];

    it('puts a notch where each chapter starts, none at the start nor past the end', () => {
        expect(getChapterMarkers(chapters, 40 * MINUTE)).toEqual([
            { name: 'Chapitre 2', progress: 0.25 },
            { name: 'Chapitre 3', progress: 0.75 }
        ]);
    });

    it('has no notch without a length', () => {
        expect(getChapterMarkers(chapters, 0)).toEqual([]);
        expect(getChapterMarkers(undefined, 40 * MINUTE)).toEqual([]);
    });

    it('finds the chapter of a position', () => {
        expect(getChapterAt(chapters, 12 * MINUTE)).toEqual({ chapter: chapters[1], index: 1 });
        expect(getChapterAt(chapters, 0)?.index).toBe(0);
        expect(getChapterAt([], 12 * MINUTE)).toBeUndefined();
    });
});

describe('getEpisodeState', () => {
    const runtime = 42 * MINUTE;

    it('reads the live position of the episode playing', () => {
        const state = getEpisodeState({ Id: 'e15', RunTimeTicks: runtime, UserData: { PlaybackPositionTicks: 0 } }, 'e15', 21 * MINUTE);
        expect(state).toEqual({ kind: 'current', progress: 50, minutesLeft: 21, minutes: 42 });
    });

    it('tells an episode started elsewhere and not finished', () => {
        const state = getEpisodeState({ Id: 'e3', RunTimeTicks: runtime, UserData: { PlaybackPositionTicks: 31.5 * MINUTE } }, 'e15');
        expect(state.kind).toBe('inProgress');
        expect(state.minutesLeft).toBe(11);
    });

    it('tells a watched episode', () => {
        expect(getEpisodeState({ Id: 'e1', RunTimeTicks: runtime, UserData: { Played: true } }, 'e15').kind).toBe('played');
    });

    it('tells an episode not watched yet with its length', () => {
        expect(getEpisodeState({ Id: 'e16', RunTimeTicks: runtime }, 'e15')).toEqual({ kind: 'unplayed', progress: 0, minutesLeft: 0, minutes: 42 });
    });
});

describe('formatPlaybackRate', () => {
    it('writes the speed in the language of the interface', () => {
        expect(formatPlaybackRate(1.25, 'fr')).toBe('1,25×');
        expect(formatPlaybackRate(1.25, 'en-US')).toBe('1.25×');
        expect(formatPlaybackRate(1, 'fr')).toBe('1×');
    });
});
