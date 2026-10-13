/**
 * The link between the SyncPlay button of the player header, drawn by React,
 * and the SyncPlay panel of the upstream player: whether the panel is open,
 * and the toggle the player gives once it is there.
 */

type Listener = () => void;

let isOpen = false;
let toggleHandler: ((trigger: HTMLElement | null) => void) | null = null;
const listeners = new Set<Listener>();

export const syncPlayControl = {
    isOpen: () => isOpen,
    subscribe: (listener: Listener) => {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },
    setOpen: (value: boolean) => {
        if (value === isOpen) return;
        isOpen = value;
        listeners.forEach(listener => {
            listener();
        });
    },
    /** Whether the player can show the panel: without it, the button opens the SyncPlay window. */
    hasPanel: () => !!toggleHandler,
    setToggleHandler: (handler: ((trigger: HTMLElement | null) => void) | null) => {
        toggleHandler = handler;
    },
    toggle: (trigger: HTMLElement | null) => toggleHandler?.(trigger)
};
