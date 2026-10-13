import { useSyncExternalStore } from 'react';

// One window for the whole interface, opened from the account menu
let isOpen = false;
const listeners = new Set<() => void>();

const setOpen = (value: boolean) => {
    if (isOpen === value) return;
    isOpen = value;
    listeners.forEach(listener => {
        listener();
    });
};

export const openContentManager = () => setOpen(true);
export const closeContentManager = () => setOpen(false);

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const useIsContentManagerOpen = () => useSyncExternalStore(subscribe, () => isOpen);
