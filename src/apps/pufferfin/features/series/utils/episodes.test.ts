import { describe, expect, it } from 'vitest';

import { CatalogAvailability, type CatalogEpisode, type CatalogSeason, CatalogSource } from '../../catalog/api/types';
import { type MediaRequest, RequestKind, RequestState } from '../../requests/api/types';
import { findEpisodeRequest, getDefaultSeasonNumber, getEpisodeKey, getMissingSeasons } from './episodes';

const makeEpisode = (overrides: Partial<CatalogEpisode> = {}): CatalogEpisode => ({
    SeasonNumber: 1,
    EpisodeNumber: 3,
    Availability: CatalogAvailability.Missing,
    Sources: [ CatalogSource.Tmdb ],
    ...overrides
});

const makeRequest = (overrides: Partial<MediaRequest> = {}): MediaRequest => ({
    Id: 'request',
    UserId: 'user',
    Kind: RequestKind.Episode,
    TmdbId: 1399,
    SeasonNumber: 1,
    EpisodeNumber: 3,
    Title: 'Game of Thrones',
    Language: 'fr',
    State: RequestState.Downloading,
    CreatedAt: '2026-10-06T10:00:00Z',
    UpdatedAt: '2026-10-06T10:00:00Z',
    ...overrides
});

const makeSeason = (seasonNumber: number, localItemId?: string): CatalogSeason => ({
    SeasonNumber: seasonNumber,
    LocalEpisodeCount: 0,
    Availability: CatalogAvailability.Missing,
    LocalItemId: localItemId,
    Sources: [ CatalogSource.Tmdb ]
});

describe('Pufferfin: series episodes', () => {
    it('finds the request of the episode itself first', () => {
        const episodeRequest = makeRequest({ Id: 'episode' });
        const seasonRequest = makeRequest({ Id: 'season', Kind: RequestKind.Season, EpisodeNumber: null });
        expect(findEpisodeRequest([ seasonRequest, episodeRequest ], 1399, makeEpisode())?.Id).toBe('episode');
    });

    it('falls back to an active request of the whole season', () => {
        const seasonRequest = makeRequest({ Id: 'season', Kind: RequestKind.Season, EpisodeNumber: null });
        expect(findEpisodeRequest([ seasonRequest ], 1399, makeEpisode())?.Id).toBe('season');
    });

    it('keeps a failed request of the episode, so it can be tried again', () => {
        const failed = makeRequest({ State: RequestState.Failed });
        expect(findEpisodeRequest([ failed ], 1399, makeEpisode())?.State).toBe(RequestState.Failed);
    });

    it('ignores finished requests, other episodes, seasons and series', () => {
        const requests = [
            makeRequest({ State: RequestState.Cancelled }),
            makeRequest({ State: RequestState.Available }),
            makeRequest({ EpisodeNumber: 4 }),
            makeRequest({ SeasonNumber: 2 }),
            makeRequest({ TmdbId: 1 }),
            makeRequest({ Kind: RequestKind.Season, EpisodeNumber: null, State: RequestState.Failed })
        ];
        expect(findEpisodeRequest(requests, 1399, makeEpisode())).toBeUndefined();
        expect(findEpisodeRequest([ makeRequest() ], 1399, makeEpisode({ EpisodeNumber: null }))).toBeUndefined();
    });

    it('opens on the season of the next episode, else the first regular season', () => {
        const seasons = [ makeSeason(0), makeSeason(1, 'season-1'), makeSeason(2, 'season-2') ];
        expect(getDefaultSeasonNumber(seasons, 'season-2')).toBe(2);
        expect(getDefaultSeasonNumber(seasons, 'unknown')).toBe(1);
        expect(getDefaultSeasonNumber(seasons)).toBe(1);
        expect(getDefaultSeasonNumber([ makeSeason(0) ])).toBe(0);
        expect(getDefaultSeasonNumber([])).toBeUndefined();
    });

    it('keys episodes apart, numbered or not', () => {
        const keys = [
            makeEpisode(),
            makeEpisode({ EpisodeNumber: 4 }),
            makeEpisode({ EpisodeNumber: null, LocalItemId: 'a' }),
            makeEpisode({ EpisodeNumber: null, LocalItemId: 'b' })
        ].map(getEpisodeKey);
        expect(new Set(keys).size).toBe(keys.length);
    });
});

describe('getMissingSeasons', () => {
    const season = (number: number, airDate: string | null, local: number, count: number | null) => ({
        SeasonNumber: number,
        AirDate: airDate,
        LocalEpisodeCount: local,
        EpisodeCount: count,
        Availability: CatalogAvailability.Missing,
        Sources: []
    });

    it('asks for the aired numbered seasons with episodes missing', () => {
        const seasons = [
            season(0, '2020-01-01', 0, 3),
            season(1, '2020-01-01', 10, 10),
            season(2, '2021-01-01', 2, 10),
            season(3, '2099-01-01', 0, 8),
            season(4, null, 0, 8)
        ];
        expect(getMissingSeasons(seasons, new Date('2026-10-08')).map(item => item.SeasonNumber)).toEqual([ 2 ]);
    });
});
