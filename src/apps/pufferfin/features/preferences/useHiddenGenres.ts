import { useCallback, useMemo } from 'react';

import { useUserPreference } from '../../utils/userPreference';
import { type GenreKey, getHiddenTmdbIds, HIDDEN_GENRES_SETTING, parseHiddenGenres } from './genres';

/** The genres the user turned off, their TMDB ids, and how to turn one on or off, or all of them back on. */
export function useHiddenGenres() {
    const [ value, setValue ] = useUserPreference(HIDDEN_GENRES_SETTING);
    const hidden = useMemo(() => parseHiddenGenres(value), [ value ]);
    const hiddenTmdbIds = useMemo(() => getHiddenTmdbIds(hidden), [ hidden ]);

    const setShown = useCallback((key: GenreKey, isShown: boolean) => {
        const next = new Set(hidden);
        if (isShown) next.delete(key);
        else next.add(key);
        setValue(next.size ? JSON.stringify([ ...next ]) : null);
    }, [ hidden, setValue ]);

    const showAll = useCallback(() => setValue(null), [ setValue ]);

    return { hidden, hiddenTmdbIds, setShown, showAll };
}
