import { useEffect, useSyncExternalStore } from 'react';

import { COMPACT_CLASS, COMPACT_QUERY, isCompactLayout } from './compactLayout';

const getMediaQuery = () => (typeof window.matchMedia === 'function' ? window.matchMedia(COMPACT_QUERY) : undefined);

const subscribe = (onChange: () => void) => {
    const query = getMediaQuery();
    query?.addEventListener('change', onChange);
    return () => query?.removeEventListener('change', onChange);
};

const getSnapshot = () => isCompactLayout(
    !!getMediaQuery()?.matches,
    document.documentElement.classList.contains('layout-tv')
);

/**
 * Whether the screen is a phone or an upright tablet, kept in step with
 * rotations and resizes. While true, the document element carries
 * `pf-compact`, which the styles key the bottom bar layout on.
 */
export function useCompactLayout() {
    const isCompact = useSyncExternalStore(subscribe, getSnapshot);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle(COMPACT_CLASS, isCompact);
        return () => root.classList.remove(COMPACT_CLASS);
    }, [ isCompact ]);

    return isCompact;
}
