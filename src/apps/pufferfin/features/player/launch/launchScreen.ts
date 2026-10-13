import { ServerConnections } from 'lib/jellyfin-apiclient';
import Events from 'utils/events';

import { ICONS } from '../osd/icons';
import { playerText } from '../osd/strings';
import { type LaunchImage, type LaunchItem, getLaunchInfo } from './launchInfo';

import './launch.scss';

/** Html class while the launch screen is up: the loader and the thin top bar step aside. */
export const LAUNCHING_CLASS = 'pf-launching';

/** Past this, the screen goes even if no frame was seen: the player underneath has its own states. */
const MAX_LAUNCH_MS = 60_000;
const FADE_MS = 220;
/** Events of the video after which its first frame may be on screen. */
const READY_EVENTS = [ 'loadeddata', 'canplay', 'playing', 'seeked' ] as const;
/** Events of a reused video that say its new source is loading. */
const RELOAD_EVENTS = [ 'emptied', 'loadstart' ] as const;

interface LaunchOptions {
    /** The playback manager, to hear when this video stops or fails before it starts. */
    emitter?: object;
    /** Stops the playback being launched: the Back of the screen. */
    onBack?: () => void;
}

interface Launch {
    itemId: string;
    root: HTMLElement;
    dispose: () => void;
}

let current: Launch | null = null;

const ITEM_TYPES_WITH_LAUNCH = new Set([ 'Movie', 'Episode', 'Video', 'MusicVideo', 'Trailer' ]);

/** A launch screen is for a video item played full screen. */
export function shouldShowLaunchScreen(item: { MediaType?: string | null; Type?: string | null }, fullscreen: boolean): boolean {
    return fullscreen && item.MediaType === 'Video' && ITEM_TYPES_WITH_LAUNCH.has(item.Type ?? '');
}

export function isLaunchScreenShown(): boolean {
    return !!current;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
};

function getImageUrl(serverId: string | null | undefined, image: LaunchImage, maxWidth: number): string | undefined {
    try {
        const apiClient = ServerConnections.getApiClient(serverId ?? undefined);
        return apiClient?.getScaledImageUrl(image.itemId, {
            type: image.type,
            tag: image.tag,
            maxWidth,
            quality: 90
        });
    } catch {
        return undefined;
    }
}

/** The video of the player, once it exists. */
const findVideo = () => document.querySelector<HTMLVideoElement>('.videoPlayerContainer video');

/** A first frame is there to show: data for the current position, and no seek under way. */
const hasFirstFrame = (video: HTMLVideoElement) => video.readyState >= 2 && !video.seeking;

function removeNow(launch: Launch) {
    launch.dispose();
    launch.root.remove();
    if (current === launch) {
        current = null;
        document.documentElement.classList.remove(LAUNCHING_CLASS);
    }
}

/** Fades the launch screen out: the video is playing underneath. */
export function hideLaunchScreen(): void {
    const launch = current;
    if (!launch) return;
    current = null;
    document.documentElement.classList.remove(LAUNCHING_CLASS);
    launch.dispose();
    launch.root.classList.add('pf-launch--leaving');
    window.setTimeout(() => launch.root.remove(), FADE_MS);
}

/** The video could not start: the screen says so and offers to go back. */
export function failLaunchScreen(message?: string): void {
    const launch = current;
    if (!launch) return;
    launch.dispose();

    const status = launch.root.querySelector('.pf-launch__status');
    const error = el('div', 'pf-launch__error');
    error.setAttribute('role', 'alert');
    error.append(
        el('p', 'pf-launch__error-title', playerText('Player.LaunchError')),
        el('p', 'pf-launch__error-detail', message || playerText('Player.LaunchErrorDetail'))
    );
    const back = el('button', 'pf-launch__button', playerText('Player.Back'));
    back.type = 'button';
    back.addEventListener('click', () => {
        removeNow(launch);
        // The player route may already be there: leave it with the screen
        if (window.location.hash.includes('/video')) window.history.back();
    });
    error.append(back);
    status?.replaceWith(error);
    launch.root.classList.add('pf-launch--failed');
    launch.root.querySelector('.pf-launch__close')?.remove();
    back.focus();
}

/**
 * Covers the screen from the start of a video until its first frame: the
 * picture of the title, filling the screen, and its name. Replaces any
 * launch screen already up (the next episode, another episode picked).
 */
export function showLaunchScreen(item: LaunchItem & { ServerId?: string | null }, options: LaunchOptions = {}): void {
    if (current) removeNow(current);

    const info = getLaunchInfo(item, (season, episode) => playerText('Player.EpisodeShort', season, episode));
    const width = Math.min(3840, Math.round(window.innerWidth * (window.devicePixelRatio || 1)));

    const root = el('div', 'pf-launch');
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    root.setAttribute('aria-label', `${playerText('Player.LaunchLoading')} · ${info.title}`);

    const art = el('div', 'pf-launch__art');
    const backdropUrl = info.backdrop ? getImageUrl(item.ServerId, info.backdrop, width) : undefined;
    if (backdropUrl) {
        const image = el('img', 'pf-launch__image');
        image.alt = '';
        image.decoding = 'async';
        image.addEventListener('load', () => image.classList.add('pf-launch__image--loaded'), { once: true });
        image.src = backdropUrl;
        art.append(image);
    }
    art.append(el('div', 'pf-launch__shade'));

    const content = el('div', 'pf-launch__content');
    const logoUrl = info.logo ? getImageUrl(item.ServerId, info.logo, 900) : undefined;
    const heading = el('h1', 'pf-launch__title', info.title);
    if (logoUrl) {
        const logo = el('img', 'pf-launch__logo');
        logo.alt = info.title;
        logo.src = logoUrl;
        // A logo that fails to load leaves the title in words
        logo.addEventListener('error', () => logo.replaceWith(heading), { once: true });
        content.append(logo);
    } else {
        content.append(heading);
    }
    if (info.detail) content.append(el('p', 'pf-launch__detail', info.detail));
    const status = el('div', 'pf-launch__status');
    status.setAttribute('aria-hidden', 'true');
    status.append(el('span', 'pf-launch__bar'));
    content.append(status);

    const close = el('button', 'pf-launch__close');
    close.type = 'button';
    close.setAttribute('aria-label', playerText('Player.Back'));
    close.innerHTML = ICONS.back;

    root.append(art, content, close);
    document.body.append(root);
    document.documentElement.classList.add(LAUNCHING_CLASS);

    const itemId = item.Id ?? '';
    const previousVideo = findVideo();
    const armed = new WeakSet<HTMLVideoElement>();
    const watched = new WeakSet<HTMLVideoElement>();
    const cleanups: Array<() => void> = [];
    let done = false;

    const finish = () => {
        if (done || current?.root !== root) return;
        done = true;
        // Two frames: the picture of the video is painted before the screen fades
        requestAnimationFrame(() => requestAnimationFrame(hideLaunchScreen));
    };

    const check = (video: HTMLVideoElement) => {
        if (armed.has(video) && hasFirstFrame(video)) finish();
    };

    const watch = (video: HTMLVideoElement) => {
        if (watched.has(video)) return;
        watched.add(video);
        // A new video has only this source; a reused one first loads the new source
        if (video !== previousVideo) armed.add(video);
        const onReload = () => armed.add(video);
        const onReady = () => check(video);
        for (const type of RELOAD_EVENTS) video.addEventListener(type, onReload);
        for (const type of READY_EVENTS) video.addEventListener(type, onReady);
        cleanups.push(() => {
            for (const type of RELOAD_EVENTS) video.removeEventListener(type, onReload);
            for (const type of READY_EVENTS) video.removeEventListener(type, onReady);
        });
        check(video);
    };

    const poll = window.setInterval(() => {
        const video = findVideo();
        if (video) watch(video);
    }, 120);
    const timeout = window.setTimeout(hideLaunchScreen, MAX_LAUNCH_MS);

    const onStopped = (_event: unknown, stopInfo?: { state?: { NowPlayingItem?: { Id?: string } } }) => {
        const stoppedId = stopInfo?.state?.NowPlayingItem?.Id;
        if (!stoppedId || stoppedId === itemId) hideLaunchScreen();
    };
    // A cancelled start is often followed by its error: give it the chance to show here
    const onCancelled = () => window.setTimeout(() => {
        if (current?.root === root && !root.classList.contains('pf-launch--failed')) hideLaunchScreen();
    }, 0);
    const onError = () => failLaunchScreen();
    if (options.emitter) {
        Events.on(options.emitter, 'playbackstop', onStopped);
        Events.on(options.emitter, 'playbackcancelled', onCancelled);
        Events.on(options.emitter, 'playbackerror', onError);
    }

    const goBack = () => {
        hideLaunchScreen();
        const { emitter, onBack } = options;
        if (!onBack) return;
        onBack();
        // The start may still be on its way: when it comes, it is stopped too
        if (emitter) {
            const onLateStart = () => {
                Events.off(emitter, 'playbackstart', onLateStart);
                window.clearTimeout(giveUp);
                onBack();
            };
            const giveUp = window.setTimeout(() => Events.off(emitter, 'playbackstart', onLateStart), 30_000);
            Events.on(emitter, 'playbackstart', onLateStart);
        }
    };
    close.addEventListener('click', goBack);
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            goBack();
        }
    };
    document.addEventListener('keydown', onKeyDown);

    current = {
        itemId,
        root,
        dispose: () => {
            window.clearInterval(poll);
            window.clearTimeout(timeout);
            document.removeEventListener('keydown', onKeyDown);
            if (options.emitter) {
                Events.off(options.emitter, 'playbackstop', onStopped);
                Events.off(options.emitter, 'playbackcancelled', onCancelled);
                Events.off(options.emitter, 'playbackerror', onError);
            }
            for (const cleanup of cleanups.splice(0)) cleanup();
        }
    };
}
