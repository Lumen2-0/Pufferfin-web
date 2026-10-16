import { useEffect } from 'react';

// Size of the sampled picture: a handful of color blobs, never a readable image
const WIDTH = 32;
const HEIGHT = 18;
const FRAME_MS = 100;

export type AmbilightLevel = 'off' | 'low' | 'medium' | 'high';
export const AMBILIGHT_LEVELS: AmbilightLevel[] = [ 'off', 'low', 'medium', 'high' ];

// How much of the glow shows, per level
const OPACITY: Record<AmbilightLevel, number> = { off: 0, low: 0.3, medium: 0.55, high: 0.85 };
const STORAGE_KEY = 'pufferfin-ambilight';

export type AmbilightSize = 'small' | 'medium' | 'large';
export const AMBILIGHT_SIZES: AmbilightSize[] = [ 'small', 'medium', 'large' ];

// How far the glow spills past the picture, per size
const SCALE: Record<AmbilightSize, number> = { small: 1.2, medium: 1.35, large: 1.6 };
const SIZE_KEY = 'pufferfin-ambilight-size';

export function getAmbilightSize(): AmbilightSize {
    try {
        const value = localStorage.getItem(SIZE_KEY);
        return AMBILIGHT_SIZES.find(size => size === value) ?? 'medium';
    } catch {
        return 'medium';
    }
}

/** Saves the size for this device and applies it to the glow on screen. */
export function setAmbilightSize(size: AmbilightSize) {
    try {
        localStorage.setItem(SIZE_KEY, size);
    } catch {
        // The size still applies until the page is closed
    }
    applySize(size);
}

function applySize(size: AmbilightSize) {
    document.documentElement.style.setProperty('--pf-ambilight-scale', String(SCALE[size]));
}

export function getAmbilightLevel(): AmbilightLevel {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        return AMBILIGHT_LEVELS.find(level => level === value) ?? 'low';
    } catch {
        return 'low';
    }
}

/** Saves the level for this device and applies it to the glow on screen. */
export function setAmbilightLevel(level: AmbilightLevel) {
    try {
        localStorage.setItem(STORAGE_KEY, level);
    } catch {
        // The level still applies until the page is closed
    }
    applyLevel(level);
}

function applyLevel(level: AmbilightLevel) {
    document.documentElement.style.setProperty('--pf-ambilight-opacity', String(OPACITY[level]));
}

function attach(container: Element) {
    const video = container.querySelector('video');
    if (!video || container.querySelector('.pf-ambilight')) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'pf-ambilight';
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.setAttribute('aria-hidden', 'true');
    container.insertBefore(canvas, container.firstChild);

    const context = canvas.getContext('2d');
    if (!context) return;

    // The glow sits exactly on the picture, not on the screen, so its colors meet the edges of the video
    const place = () => {
        const { videoWidth, videoHeight } = video;
        if (!videoWidth || !videoHeight) return;
        const { clientWidth, clientHeight } = container;
        const scale = Math.min(clientWidth / videoWidth, clientHeight / videoHeight);
        const width = videoWidth * scale;
        const height = videoHeight * scale;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.style.left = `${(clientWidth - width) / 2}px`;
        canvas.style.top = `${(clientHeight - height) / 2}px`;
    };

    // Each sample blends into the last: the colors drift instead of jumping
    const draw = (blend: number) => {
        if (getAmbilightLevel() === 'off' || video.readyState < 2) return;
        context.globalAlpha = blend;
        context.drawImage(video, 0, 0, WIDTH, HEIGHT);
    };
    // A jump in the film, or a first picture: the glow takes the new colors at once, even paused
    const jump = () => {
        place();
        draw(1);
    };
    // Measured here and on a resize only: reading the layout at every sample can make the player stutter
    window.addEventListener('resize', place);
    video.addEventListener('seeked', jump);
    video.addEventListener('loadeddata', jump);
    video.addEventListener('playing', jump);

    let last = 0;
    const tick = (now: number) => {
        if (!container.isConnected) {
            window.removeEventListener('resize', place);
            video.removeEventListener('seeked', jump);
            video.removeEventListener('loadeddata', jump);
            video.removeEventListener('playing', jump);
            return;
        }
        requestAnimationFrame(tick);
        if (now - last < FRAME_MS || video.paused) return;
        last = now;
        draw(0.25);
    };
    requestAnimationFrame(tick);
}

/**
 * Ambilight of the video player: the colors of the picture glow around it where
 * the screen is wider or taller than the video. Not on a TV, nor when the user
 * asked for less motion.
 */
export function useAmbilight() {
    useEffect(() => {
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

        applyLevel(getAmbilightLevel());
        applySize(getAmbilightSize());
        const check = () => {
            if (document.documentElement.classList.contains('layout-tv')) return;
            const container = document.querySelector('.videoPlayerContainer');
            if (container) attach(container);
        };
        const observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true });
        check();
        return () => observer.disconnect();
    }, []);
}
