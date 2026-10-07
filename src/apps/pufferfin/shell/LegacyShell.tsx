import React, { type FC, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { EventType } from 'constants/eventType';
import Events from 'utils/events';

import PufferfinShell from './PufferfinShell';
import { useIsShellPath } from './useIsShellPath';

/** Class on the document element while the Pufferfin bar replaces the upstream header buttons. */
export const LEGACY_SHELL_CLASS = 'pf-shell-legacy';
const SLOT_CLASS = 'pf-shell-slot';

/** Finds or creates the slot of the Pufferfin bar at the top of the upstream header. */
function getSlot(): HTMLElement | null {
    const header = document.querySelector<HTMLElement>('.skinHeader');
    if (!header) return null;

    let slot = header.querySelector<HTMLElement>(`:scope > .${SLOT_CLASS}`);
    if (!slot) {
        slot = document.createElement('div');
        slot.className = SLOT_CLASS;
        header.prepend(slot);
    }
    return slot;
}

/**
 * Legacy layouts (TV included) keep the upstream header element: the legacy
 * views write their section tabs into it. Only its row of buttons is hidden,
 * and the Pufferfin bar takes its place inside the same header.
 */
const LegacyShell: FC = () => {
    const [ slot, setSlot ] = useState<HTMLElement | null>(null);
    const isShown = useIsShellPath();

    useEffect(() => {
        // The upstream header rewrites its content when it renders: the slot is recreated then
        const mount = () => setSlot(getSlot());

        mount();
        Events.on(document, EventType.HEADER_RENDERED, mount);
        return () => {
            Events.off(document, EventType.HEADER_RENDERED, mount);
        };
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle(LEGACY_SHELL_CLASS, isShown);
        return () => {
            document.documentElement.classList.remove(LEGACY_SHELL_CLASS);
        };
    }, [ isShown ]);

    if (!slot || !isShown) return null;
    return createPortal(<PufferfinShell />, slot);
};

export default LegacyShell;
