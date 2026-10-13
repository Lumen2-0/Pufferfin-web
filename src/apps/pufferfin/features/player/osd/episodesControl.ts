/**
 * The link between the Episodes button of the player header, drawn by React,
 * and the Episodes drawer of the upstream player: whether the video is an
 * episode with a series to browse, whether the drawer is open, and the toggle.
 */

type Listener = () => void;

interface EpisodesState {
    isAvailable: boolean
    isOpen: boolean
}

let state: EpisodesState = { isAvailable: false, isOpen: false };
let toggleHandler: ((trigger: HTMLElement | null) => void) | null = null;
const listeners = new Set<Listener>();

function setState(next: Partial<EpisodesState>) {
    const merged = { ...state, ...next };
    if (merged.isAvailable === state.isAvailable && merged.isOpen === state.isOpen) return;
    state = merged;
    listeners.forEach(listener => {
        listener();
    });
}

export const episodesControl = {
    getState: (): EpisodesState => state,
    subscribe: (listener: Listener) => {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },
    setAvailable: (isAvailable: boolean) => setState({ isAvailable }),
    setOpen: (isOpen: boolean) => setState({ isOpen }),
    /** The player says what the button does; nothing before it is there. */
    setToggleHandler: (handler: ((trigger: HTMLElement | null) => void) | null) => {
        toggleHandler = handler;
    },
    toggle: (trigger: HTMLElement | null) => toggleHandler?.(trigger)
};
