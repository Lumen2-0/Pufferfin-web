import { type DependencyList, type RefObject, useEffect } from 'react';

import { focusFirst } from './focus';

/**
 * Gives the focus a starting point inside the container once its content is
 * there, unless the user already moved it somewhere.
 * Re-runs when the dependencies change, such as when data finishes loading.
 */
export function useInitialFocus(containerRef: RefObject<HTMLElement>, deps: DependencyList) {
    useEffect(() => {
        const container = containerRef.current;
        const active = document.activeElement;
        if (container && (!active || active === document.body)) {
            focusFirst(container);
        }
    }, deps);
}
