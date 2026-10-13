import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CatalogAvailability, CatalogItemKind, type CatalogTitleDetails } from '../features/catalog/api/types';
import { getCatalogItemPath } from '../features/catalog/utils/catalog';
import { getItemPath } from './paths';
// Imported once with the file: a cold import of the page inside the first test would eat its time limit
import { Component } from './title';

// Each branch of the sheet is replaced by its main button: what is under test is which one the same route shows
vi.mock('./item', () => ({ ItemDetails: ({ itemId }: { itemId: string }) => <button type='button' data-item={itemId}>Play</button> }));
vi.mock('../features/requests/components/RequestActions', () => ({ default: () => <button type='button'>Download</button> }));
vi.mock('../features/series/components/SeriesEpisodes', () => ({ default: () => null }));
vi.mock('../features/audiobooks/components/AudiobookSheet', () => ({ default: () => null }));
vi.mock('../components/CatalogCard', () => ({ default: () => null }));
vi.mock('../features/requests/api/useRequests', () => ({ useMyRequests: () => ({ data: [], isPending: false, dataUpdatedAt: 0 }) }));
vi.mock('../features/requests/api/useCanRequest', () => ({ useCanRequest: () => ({ canRequest: true, isSettled: true }) }));
vi.mock('../utils/userPreference', () => ({ useUserPreference: () => [ null, () => undefined ] }));
vi.mock('lib/globalize', () => ({ default: { getCurrentLocale: () => 'en-us' } }));

const catalogTitle = vi.fn<() => { data?: CatalogTitleDetails, isPending: boolean, isError: boolean, error: null }>();
vi.mock('../features/catalog/api/useCatalog', () => ({
    useCatalogTitle: () => catalogTitle(),
    useSeriesSeasons: () => ({ isPending: false })
}));

// React warns outside of an act environment
Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

const matrix = (availability: CatalogAvailability, localItemId?: string): CatalogTitleDetails => ({
    Kind: CatalogItemKind.Movie,
    TmdbId: 603,
    Title: 'The Matrix',
    Genres: [],
    Countries: [],
    Recommendations: [],
    Availability: availability,
    LocalItemId: localItemId
});

describe('Pufferfin: the one title sheet', () => {
    let container: HTMLDivElement;
    let root: Root;

    const render = async (path: string) => {
        const router = createMemoryRouter([ { path: '/pufferfin/title/:kind/:id', Component } ], { initialEntries: [ path ] });
        act(() => root.render(<RouterProvider router={router} />));
    };
    const buttons = () => Array.from(container.querySelectorAll('button')).map(button => button.textContent);

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    // A title on disk and a missing one, both opened from a Discover card: both land on the one title sheet route
    const fromDiscover = (availability: CatalogAvailability) => getCatalogItemPath({
        Key: 'tmdb:movie:603',
        Kind: CatalogItemKind.Movie,
        Title: 'The Matrix',
        Availability: availability,
        LocalItemId: availability === CatalogAvailability.OnDisk ? 'local-603' : null,
        TmdbId: 603
    })!;

    it('shows Play for a title already downloaded, opened from Discover', async () => {
        catalogTitle.mockReturnValue({ data: matrix(CatalogAvailability.OnDisk, 'local-603'), isPending: false, isError: false, error: null });
        await render(fromDiscover(CatalogAvailability.OnDisk));
        expect(buttons()).toEqual([ 'Play' ]);
        expect(container.querySelector('[data-item]')?.getAttribute('data-item')).toBe('local-603');
    });

    it('shows Play when a title on disk is opened by its TMDB id, as from a recommendation', async () => {
        catalogTitle.mockReturnValue({ data: matrix(CatalogAvailability.OnDisk, 'local-603'), isPending: false, isError: false, error: null });
        await render('/pufferfin/title/movie/603');
        expect(buttons()).toEqual([ 'Play' ]);
    });

    it('shows Download on the same page for a missing title', async () => {
        catalogTitle.mockReturnValue({ data: matrix(CatalogAvailability.Missing), isPending: false, isError: false, error: null });
        await render(fromDiscover(CatalogAvailability.Missing));
        expect(buttons()).toContain('Download');
        expect(buttons()).not.toContain('Play');
    });

    it('switches to Play at the same address once the catalog reports the import', async () => {
        catalogTitle.mockReturnValue({ data: matrix(CatalogAvailability.Missing), isPending: false, isError: false, error: null });
        await render(fromDiscover(CatalogAvailability.Missing));
        expect(buttons()).toContain('Download');

        // The catalog read again after the import now reports the title on disk
        catalogTitle.mockReturnValue({ data: matrix(CatalogAvailability.OnDisk, 'local-603'), isPending: false, isError: false, error: null });
        await render(fromDiscover(CatalogAvailability.Missing));
        expect(buttons()).toEqual([ 'Play' ]);
    });

    it('shows the same sheet when opened by library id', async () => {
        await render(getItemPath('local-603'));
        expect(buttons()).toEqual([ 'Play' ]);
    });
});
