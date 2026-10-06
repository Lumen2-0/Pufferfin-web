import enUS from '../strings/en-us.json';

/**
 * Pufferfin strings live in their own dictionaries next to the app, so the
 * upstream `src/strings` files never carry Pufferfin keys and never conflict on merge.
 * English is the source language and the final fallback.
 */
export type StringKey = keyof typeof enUS;
type Dictionary = Partial<Record<StringKey, string>>;

export const FALLBACK_LOCALE = 'en-us';

const dictionaries: Record<string, Dictionary | undefined> = {
    [FALLBACK_LOCALE]: enUS
};
const pending: Record<string, Promise<void> | undefined> = {};

/** Locales to try for a culture, most specific first: `fr-ca` gives `fr-ca`, `fr`. */
export function getLocaleCandidates(locale?: string): string[] {
    if (!locale) return [];

    const normalized = locale.replace('_', '-').toLowerCase();
    const base = normalized.split('-')[0];
    return base && base !== normalized ? [ normalized, base ] : [ normalized ];
}

export function format(template: string, args: Array<string | number>) {
    return args.reduce<string>(
        (text, arg, index) => text.split(`{${index}}`).join(String(arg)),
        template
    );
}

export function translate(locale: string | undefined, key: StringKey, ...args: Array<string | number>) {
    const candidates = getLocaleCandidates(locale).concat(FALLBACK_LOCALE);

    for (const candidate of candidates) {
        const value = dictionaries[candidate]?.[key];
        if (value) return format(value, args);
    }

    console.error(`[Pufferfin] Translation key is missing from dictionary: ${key}`);
    return key;
}

function loadDictionary(locale: string) {
    if (dictionaries[locale]) return Promise.resolve();

    pending[locale] ??= import(/* webpackChunkName: "pufferfin-strings-[request]" */ `../strings/${locale}.json`)
        .then((module: { default?: Dictionary } & Dictionary) => {
            dictionaries[locale] = module.default ?? module;
        })
        .catch(() => {
            // No translation for this locale yet: the fallback applies
            dictionaries[locale] = {};
        });

    return pending[locale];
}

/** Loads the dictionaries needed to translate into the given culture. */
export function loadLocale(locale: string | undefined) {
    return Promise.all(getLocaleCandidates(locale).map(loadDictionary)).then(() => undefined);
}

/** Test helper: registers a dictionary without going through a dynamic import. */
export function registerDictionary(locale: string, dictionary: Dictionary) {
    dictionaries[locale] = dictionary;
}
