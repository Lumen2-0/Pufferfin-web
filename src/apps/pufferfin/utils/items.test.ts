import { describe, expect, it } from 'vitest';

import type { UserItemDataDto } from '@jellyfin/sdk/lib/generated-client/models/user-item-data-dto';

import type { ItemDto } from 'types/base/models/item-dto';
import { ItemKind } from 'types/base/models/item-kind';

import { getDisplayTitle, getEpisodeNumbers, getPlayedPercentage, isResumable } from './items';

const withUserData = (userData: Partial<UserItemDataDto>) => ({ UserData: userData }) as ItemDto;

const episode: ItemDto = {
    Type: ItemKind.Episode,
    Name: 'Pilot',
    SeriesName: 'The Show',
    ParentIndexNumber: 1,
    IndexNumber: 2
};

describe('Pufferfin: item helpers', () => {
    it('titles an episode with its series', () => {
        expect(getDisplayTitle(episode)).toBe('The Show');
        expect(getDisplayTitle({ Type: ItemKind.Movie, Name: 'A Movie' })).toBe('A Movie');
        expect(getDisplayTitle({ Type: ItemKind.Movie })).toBe('');
    });

    it('returns season and episode numbers only for complete episodes', () => {
        expect(getEpisodeNumbers(episode)).toEqual([ 1, 2 ]);
        expect(getEpisodeNumbers({ ...episode, IndexNumber: null })).toBeUndefined();
        expect(getEpisodeNumbers({ Type: ItemKind.Movie, IndexNumber: 1 })).toBeUndefined();
    });

    it('rounds and clamps the watched share', () => {
        expect(getPlayedPercentage(withUserData({ PlayedPercentage: 42.6 }))).toBe(43);
        expect(getPlayedPercentage(withUserData({ PlayedPercentage: 140 }))).toBe(100);
        expect(getPlayedPercentage(withUserData({ PlayedPercentage: 0 }))).toBeUndefined();
        expect(getPlayedPercentage({})).toBeUndefined();
    });

    it('is resumable only with a saved position', () => {
        expect(isResumable(withUserData({ PlaybackPositionTicks: 10 }))).toBe(true);
        expect(isResumable(withUserData({ PlaybackPositionTicks: 0 }))).toBe(false);
        expect(isResumable({})).toBe(false);
    });
});
