import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, type NavigateFunction, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PlaybackSkin from './PlaybackSkin';
import {
    DIALOG_SKIN_CLASS,
    getPlaybackSkinClasses,
    isDashboardPathname,
    PLAYER_SKIN_CLASS
} from './playerSkin';

// Hoisted above the imports: the dashboard route table pulls the whole admin app; only its paths are read here
vi.mock('apps/dashboard/routes/routes', () => ({
    // eslint-disable-next-line @typescript-eslint/naming-convention -- the name of the mocked export
    DASHBOARD_APP_PATHS: { Dashboard: 'dashboard', MetadataManager: 'metadata', PluginConfig: 'configurationpage' }
}));
vi.mock('../dialogs/dialogs.scss', () => ({}));
vi.mock('./lyrics.scss', () => ({}));
vi.mock('./nowPlayingBar.scss', () => ({}));
vi.mock('./player.scss', () => ({}));
vi.mock('./queue.scss', () => ({}));

// React warns outside of an act environment
Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

// Where a playback can start: Pufferfin screens, upstream pages, the player itself
const PLAYBACK_ORIGINS = [
    '/home',
    '/pufferfin/item/abc',
    '/pufferfin/library',
    '/details',
    '/list',
    '/livetv',
    '/music',
    '/video',
    '/queue',
    '/lyrics',
    '/dashboard',
    '/dashboard/users'
];

describe('Pufferfin: playback skin classes', () => {
    it.each(PLAYBACK_ORIGINS)('skins the player whatever the origin: %s', pathname => {
        expect(getPlaybackSkinClasses(pathname)).toContain(PLAYER_SKIN_CLASS);
    });

    it.each([ '/home', '/details', '/video', '/queue', '/lyrics', '/mypreferencesplayback' ])(
        'skins the shared dialogs on the user pages: %s',
        pathname => {
            expect(getPlaybackSkinClasses(pathname)).toContain(DIALOG_SKIN_CLASS);
        }
    );

    it('leaves the dialogs of the admin dashboard to its own theme', () => {
        expect(getPlaybackSkinClasses('/dashboard/libraries')).not.toContain(DIALOG_SKIN_CLASS);
        expect(getPlaybackSkinClasses('/metadata')).not.toContain(DIALOG_SKIN_CLASS);
        expect(getPlaybackSkinClasses('/configurationpage')).not.toContain(DIALOG_SKIN_CLASS);
    });

    it('matches dashboard paths by segment only', () => {
        expect(isDashboardPathname('/dashboard')).toBe(true);
        expect(isDashboardPathname('/dashboardish')).toBe(false);
    });
});

describe('Pufferfin: playback skin on the document', () => {
    let container: HTMLDivElement;
    let root: Root;
    const classList = document.documentElement.classList;

    let navigate: NavigateFunction;

    // Stands for any upstream screen that navigates, such as a play button opening the video screen
    const Navigator = () => {
        navigate = useNavigate();
        return null;
    };

    const mount = (pathname: string) => act(() => root.render(
        <MemoryRouter initialEntries={[ pathname ]}>
            <PlaybackSkin />
            <Navigator />
        </MemoryRouter>
    ));
    const go = (pathname: string) => act(() => {
        navigate(pathname);
    });

    beforeEach(() => {
        container = document.createElement('div');
        document.body.append(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it('skins a playback started from an upstream page, through to the player', () => {
        mount('/details?id=upstream-item');
        expect(classList.contains(PLAYER_SKIN_CLASS)).toBe(true);
        expect(classList.contains(DIALOG_SKIN_CLASS)).toBe(true);

        // The upstream play button navigates to the video screen
        go('/video');
        expect(classList.contains(PLAYER_SKIN_CLASS)).toBe(true);
        expect(classList.contains(DIALOG_SKIN_CLASS)).toBe(true);
    });

    it('keeps the player skin in the dashboard and drops the dialog skin there', () => {
        mount('/queue');
        go('/dashboard');
        expect(classList.contains(PLAYER_SKIN_CLASS)).toBe(true);
        expect(classList.contains(DIALOG_SKIN_CLASS)).toBe(false);
    });

    it('removes its classes when unmounted', () => {
        mount('/lyrics');
        act(() => root.unmount());
        expect(classList.contains(PLAYER_SKIN_CLASS)).toBe(false);
        expect(classList.contains(DIALOG_SKIN_CLASS)).toBe(false);
        root = createRoot(container);
    });
});
