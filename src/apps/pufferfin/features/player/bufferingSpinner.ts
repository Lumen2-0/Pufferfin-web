import { useEffect } from 'react';

const CLASS = 'pf-buffering';
const START_EVENTS = [ 'waiting' ];
const END_EVENTS = [ 'playing', 'canplay', 'emptied', 'error', 'ended' ];

/**
 * A ring over the video while it waits for data, such as after a jump in a
 * film the server has to transcode: without it the picture looks frozen.
 */
export function useBufferingSpinner() {
    useEffect(() => {
        const inPlayer = (event: Event) => event.target instanceof HTMLVideoElement && !!event.target.closest('.videoPlayerContainer');
        const root = document.documentElement;
        const start = (event: Event) => {
            if (inPlayer(event)) root.classList.add(CLASS);
        };
        const end = (event: Event) => {
            if (inPlayer(event)) root.classList.remove(CLASS);
        };

        // Media events do not bubble: captured at the document
        for (const type of START_EVENTS) document.addEventListener(type, start, true);
        for (const type of END_EVENTS) document.addEventListener(type, end, true);
        return () => {
            for (const type of START_EVENTS) document.removeEventListener(type, start, true);
            for (const type of END_EVENTS) document.removeEventListener(type, end, true);
            root.classList.remove(CLASS);
        };
    }, []);
}
