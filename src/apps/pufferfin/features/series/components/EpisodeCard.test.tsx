import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CatalogAvailability, type CatalogEpisode, CatalogSource } from '../../catalog/api/types';
import { type MediaRequest, RequestKind, RequestState } from '../../requests/api/types';
import { getEpisodeKey } from '../utils/episodes';
import EpisodeCard, { getEpisodeCardView } from './EpisodeCard';

// The API context and the upstream language module pull the whole legacy app; the card under test does not use them
vi.mock('hooks/useApi', () => ({ useApi: () => ({}) }));
vi.mock('lib/globalize', () => ({ default: { getCurrentLocale: () => 'en-us' } }));

// React warns outside of an act environment
Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

const echo = (key: string, ...args: Array<string | number>) => [ key, ...args ].join(' ');
const noop = () => undefined;
const noImage = () => undefined;

const missing: CatalogEpisode = {
    SeasonNumber: 1,
    EpisodeNumber: 3,
    Title: 'The Pilot',
    Availability: CatalogAvailability.Missing,
    Sources: [ CatalogSource.Tmdb ]
};
const onDisk: CatalogEpisode = { ...missing, Availability: CatalogAvailability.OnDisk, LocalItemId: 'item', Sources: [ CatalogSource.Tmdb, CatalogSource.Library ] };
const downloading: MediaRequest = {
    Id: 'request',
    UserId: 'user',
    Kind: RequestKind.Episode,
    TmdbId: 1399,
    SeasonNumber: 1,
    EpisodeNumber: 3,
    Title: 'Series',
    Language: 'fr',
    State: RequestState.Downloading,
    Progress: 0.4,
    CreatedAt: '2026-10-06T10:00:00Z',
    UpdatedAt: '2026-10-06T10:00:00Z'
};

describe('Pufferfin: episode card', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    const render = (episode: CatalogEpisode, request?: MediaRequest, canRequest = true) => act(() => {
        root.render(
            <EpisodeCard
                episode={episode}
                request={request}
                isStale={false}
                canRequest={canRequest}
                onSelect={noop}
                getLibraryImageUrl={noImage}
            />
        );
    });

    it('keeps the same focused element from missing to requested to on disk', () => {
        render(missing);
        const button = container.querySelector('button');
        expect(button).not.toBeNull();
        button?.focus();
        expect(document.activeElement).toBe(button);

        render(missing, downloading);
        expect(container.querySelector('button')).toBe(button);
        expect(document.activeElement).toBe(button);

        render(onDisk);
        expect(container.querySelector('button')).toBe(button);
        expect(document.activeElement).toBe(button);
    });

    it('shows a missing episode that cannot be requested as a tile, not a focus stop', () => {
        render(missing, undefined, false);
        expect(container.querySelector('button')).toBeNull();
        expect(container.querySelector('.pf-card--static')).not.toBeNull();
    });

    it('gives each state its action', () => {
        const state = { isStale: false, canRequest: true };
        expect(getEpisodeCardView({ ...state, episode: onDisk }, echo).action).toBe('play');
        expect(getEpisodeCardView({ ...state, episode: missing, request: downloading }, echo).action).toBe('openDownloads');
        expect(getEpisodeCardView({ ...state, episode: missing }, echo).action).toBe('request');
        expect(getEpisodeCardView({ ...state, episode: { ...missing, EpisodeNumber: null } }, echo).action).toBeUndefined();
        expect(getEpisodeCardView({ ...state, episode: missing, canRequest: false }, echo).action).toBeUndefined();
    });

    it('says when a download bar has had no news for a while', () => {
        const view = getEpisodeCardView({ episode: missing, request: downloading, isStale: true, canRequest: true }, echo);
        expect(view.subtitle).toBe('EpisodeNumber 1 3, RequestDownloadingPercent 40, RequestStale');
        expect(view.progress).toBe(40);
    });

    it('keys an episode the same before and after its import', () => {
        expect(getEpisodeKey(onDisk)).toBe(getEpisodeKey(missing));
    });
});
