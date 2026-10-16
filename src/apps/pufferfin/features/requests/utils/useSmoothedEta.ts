import { useMemo, useRef } from 'react';

import { type MediaRequest, RequestState } from '../api/types';

/** qBittorrent reports 100 days when it has no idea. */
const UNKNOWN_ETA_SECONDS = 8640000;
/** Shortest span between two samples of the progress, in ms: shorter ones are too noisy to give a speed. */
const MIN_SAMPLE_MS = 5000;
/** Weight of a new speed sample against the speed kept so far. */
const NEW_SAMPLE_WEIGHT = 0.3;

/**
 * Time left of a download, in seconds. The server's figure jumps with every
 * speed change; this one also follows the real progress between updates (a
 * smoothed speed) and blends both, so the end time moves less.
 */
export const useSmoothedEta = (item: MediaRequest): number | undefined => {
    const last = useRef<{ at: number, progress: number, rate?: number }>();

    return useMemo(() => {
        if (item.State !== RequestState.Downloading) {
            last.current = undefined;
            return undefined;
        }
        const progress = item.Progress ?? 0;
        const now = Date.now();
        const previous = last.current;
        let rate = previous?.rate;
        if (!previous || progress < previous.progress) {
            last.current = { at: now, progress };
            rate = undefined;
        } else if (progress > previous.progress && now - previous.at >= MIN_SAMPLE_MS) {
            const sample = (progress - previous.progress) / ((now - previous.at) / 1000);
            rate = rate ? rate * (1 - NEW_SAMPLE_WEIGHT) + sample * NEW_SAMPLE_WEIGHT : sample;
            last.current = { at: now, progress, rate };
        }
        const own = rate ? (1 - progress) / rate : undefined;
        const server = item.EtaSeconds && item.EtaSeconds < UNKNOWN_ETA_SECONDS ? item.EtaSeconds : undefined;
        if (own && server) return Math.round(own * 0.6 + server * 0.4);
        return own ? Math.round(own) : server;
    }, [ item.State, item.Progress, item.EtaSeconds ]);
};
