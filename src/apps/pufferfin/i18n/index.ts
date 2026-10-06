import { useEffect, useState } from 'react';

import { getLanguages, normalizeLocaleName } from 'lib/globalize';

import enUs from './strings/en-us.json';

/** A key of the Pufferfin dictionary. The English source dictionary is the reference. */
export type PufferfinStringKey = keyof typeof enUs;

type Dictionary = Partial<Record<PufferfinStringKey, string>>;

const FALLBACK_LOCALE = 'en-us';

// Pufferfin strings live in their own dictionaries, next to the Pufferfin code, so that an upstream merge never
// touches them. The English source is bundled; other languages are loaded on demand.
const dictionaries: Record<string, Dictionary> = {
    [FALLBACK_LOCALE]: enUs
};

const loading: Record<string, Promise<void>> = {};

const getLocales = (): string[] => getLanguages().map(normalizeLocaleName);

const loadDictionary = (locale: string): Promise<void> => {
    if (dictionaries[locale]) return Promise.resolve();

    loading[locale] ??= import(
        /* webpackChunkName: "pufferfin-strings-[request]" */ `./strings/${locale}.json`
    ).then(
        (module: { default: Dictionary }) => {
            dictionaries[locale] = module.default;
        },
        () => {
            // No dictionary for this locale: the English source is used.
            dictionaries[locale] = {};
        }
    );

    return loading[locale];
};

/** Loads the Pufferfin dictionaries of the current language. Resolves immediately once loaded. */
export const loadPufferfinStrings = async (): Promise<void> => {
    await Promise.all(getLocales().map(loadDictionary));
};

/**
 * Translates a Pufferfin string. Arguments replace the `{0}`, `{1}`... placeholders.
 * Falls back to the base language, then to the English source.
 */
export const translate = (key: PufferfinStringKey, ...args: Array<string | number>): string => {
    // A key missing from the source dictionary shows itself rather than nothing.
    let value: string = enUs[key] ?? key;

    for (const locale of getLocales()) {
        const localized = dictionaries[locale]?.[key];
        if (localized) {
            value = localized;
            break;
        }
    }

    return args.reduce<string>((text, arg, index) => text.split(`{${index}}`).join(String(arg)), value);
};

/** Loads the Pufferfin dictionaries and re-renders the component once they are available. */
export const usePufferfinStrings = () => {
    const [ isLoaded, setIsLoaded ] = useState(false);

    useEffect(() => {
        let isActive = true;

        loadPufferfinStrings()
            .then(() => {
                if (isActive) setIsLoaded(true);
            })
            .catch(err => {
                console.warn('[Pufferfin] failed to load strings', err);
            });

        return () => {
            isActive = false;
        };
    }, []);

    return isLoaded;
};
