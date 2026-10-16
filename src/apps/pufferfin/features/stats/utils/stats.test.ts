import { describe, expect, it } from 'vitest';

import { computeStats, getWatchedYears, type PlayedItem, splitMinutes } from './stats';

const hour = 60 * 600_000_000;
const movie = (date: string, hours: number, genres: string[], plays = 1): PlayedItem => ({
    Type: 'Movie', RunTimeTicks: hours * hour, Genres: genres, UserData: { LastPlayedDate: date, PlayCount: plays }
});

describe('watch statistics', () => {
    const items: PlayedItem[] = [
        movie('2025-03-10T20:00:00', 2, [ 'Drama' ], 2),
        movie('2026-01-05T20:00:00', 1, [ 'Drama', 'Comedy' ]),
        { Type: 'Episode', SeriesId: 's1', RunTimeTicks: hour, UserData: { LastPlayedDate: '2026-01-20T20:00:00', PlayCount: 1 } }
    ];
    const seriesGenres = new Map([ [ 's1', [ 'Comedy' ] ] ]);

    it('counts every play over the whole history', () => {
        const all = computeStats(items, seriesGenres);
        expect(all.minutes).toBe(6 * 60);
        expect(all.movies).toBe(3);
        expect(all.episodes).toBe(1);
    });

    it('counts each title once in a year, with the genres of the series for an episode', () => {
        const year = computeStats(items, seriesGenres, 2026);
        expect(year.minutes).toBe(2 * 60);
        expect(year.topGenres.find(genre => genre.name === 'Comedy')?.minutes).toBe(2 * 60);
        expect(year.busiestMonth).toBe(0);
    });

    it('lists the years with something watched, latest first', () => {
        expect(getWatchedYears(items)).toEqual([ 2026, 2025 ]);
        expect(computeStats([], seriesGenres, 2026).busiestMonth).toBeUndefined();
    });

    it('splits minutes into hours and minutes', () => {
        expect(splitMinutes(125)).toEqual({ hours: 2, minutes: 5 });
    });
});
