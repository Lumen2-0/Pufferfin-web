import { useEffect } from 'react';

import { useUserPreference } from '../../utils/userPreference';

/** How big the posters and the featured card are drawn, as the user chose in the settings. */
export enum InterfaceSize {
    Small = 'small',
    Medium = 'medium',
    Large = 'large'
}

export const POSTER_SIZE_SETTING = 'pufferfin-poster-size';
export const HERO_SIZE_SETTING = 'pufferfin-hero-size';

export const parseInterfaceSize = (value: string | null | undefined) =>
    (value === InterfaceSize.Small || value === InterfaceSize.Large ? value : InterfaceSize.Medium);

// A factor on the width of the cards
const POSTER_SCALE: Record<InterfaceSize, number> = {
    [InterfaceSize.Small]: 0.8,
    [InterfaceSize.Medium]: 1,
    [InterfaceSize.Large]: 1.25
};

// A share of the screen height taken by the featured card
const HERO_HEIGHT: Record<InterfaceSize, number> = {
    [InterfaceSize.Small]: 50,
    [InterfaceSize.Medium]: 64,
    [InterfaceSize.Large]: 86
};

export function usePosterSize(): [ InterfaceSize, (size: InterfaceSize) => void ] {
    const [ value, setValue ] = useUserPreference(POSTER_SIZE_SETTING);
    return [ parseInterfaceSize(value), setValue ];
}

export function useHeroSize(): [ InterfaceSize, (size: InterfaceSize) => void ] {
    const [ value, setValue ] = useUserPreference(HERO_SIZE_SETTING);
    return [ parseInterfaceSize(value), setValue ];
}

/** Puts the two choices on the root, where the styles read them. */
export function useInterfaceSizes() {
    const [ poster ] = usePosterSize();
    const [ hero ] = useHeroSize();

    useEffect(() => {
        const style = document.documentElement.style;
        style.setProperty('--pf-poster-scale', String(POSTER_SCALE[poster]));
        style.setProperty('--pf-hero-vh', String(HERO_HEIGHT[hero]));
        return () => {
            style.removeProperty('--pf-poster-scale');
            style.removeProperty('--pf-hero-vh');
        };
    }, [ poster, hero ]);
}
