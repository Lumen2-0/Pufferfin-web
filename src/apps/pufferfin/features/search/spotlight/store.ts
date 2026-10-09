import { useSyncExternalStore } from 'react';

/**
 * Whether the search panel is open. One panel for the whole interface: the
 * Search tab, the keyboard shortcut and the /search address all open it.
 */
let isOpen = false;
const listeners = new Set<() => void>();

const set = (value: boolean) => {
    if (isOpen === value) return;
    isOpen = value;
    listeners.forEach(listener => {
        listener();
    });
};

export const openSpotlight = () => set(true);
export const closeSpotlight = () => set(false);

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const useIsSpotlightOpen = () => useSyncExternalStore(subscribe, () => isOpen);
