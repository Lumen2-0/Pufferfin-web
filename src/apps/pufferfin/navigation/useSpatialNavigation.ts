import { type RefObject, useEffect, useRef } from 'react';

import { getKeyName } from 'scripts/keyboardNavigation';

import { moveFocus, rememberFocus } from './focus';
import { getDirection } from './spatial';

const isTextInput = (element: Element | null) => {
    if (!element) return false;
    if (element.tagName === 'TEXTAREA') return true;
    return element.tagName === 'INPUT'
        && [ 'button', 'checkbox', 'radio', 'submit', 'reset' ].indexOf((element as HTMLInputElement).type) === -1;
};

/**
 * Arrow key, remote and gamepad navigation for everything rendered inside the root.
 *
 * The listener sits on the document, so it runs before the upstream handler bound
 * on the window; handled keys are marked with preventDefault, which the upstream
 * handler honors.
 *
 * @param rootRef Container of the focusable elements.
 * @param onBack Called on Back or Escape; returns true if it handled the key.
 */
export function useSpatialNavigation(
    rootRef: RefObject<HTMLElement>,
    onBack: () => boolean
) {
    // Keep the latest callback without re-binding the listener on each render
    const onBackRef = useRef(onBack);
    onBackRef.current = onBack;

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const root = rootRef.current;
            if (!root || e.defaultPrevented) return;
            if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;

            const key = getKeyName(e);
            const direction = getDirection(key);
            const active = document.activeElement;

            if (direction) {
                // Left and right move the caret inside a text field
                if (isTextInput(active) && (direction === 'left' || direction === 'right')) return;

                // Always captured: a native page scroll would move the view away from the focus
                e.preventDefault();
                moveFocus(root, direction);
                return;
            }

            if (key === 'GamepadA' && active instanceof HTMLElement && root.contains(active)) {
                e.preventDefault();
                active.click();
                return;
            }

            if ((key === 'Back' || key === 'Escape') && onBackRef.current()) {
                e.preventDefault();
            }
        };

        const onFocusIn = (e: FocusEvent) => {
            if (e.target instanceof Element) rememberFocus(e.target);
        };

        const root = rootRef.current;
        document.addEventListener('keydown', onKeyDown);
        root?.addEventListener('focusin', onFocusIn);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            root?.removeEventListener('focusin', onFocusIn);
        };
    }, [ rootRef ]);
}
