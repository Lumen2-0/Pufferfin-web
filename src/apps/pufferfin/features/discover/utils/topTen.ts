import type { CatalogItem } from '../../catalog/api/types';

/** How many titles a top row ranks. */
export const TOP_COUNT = 10;

/** French elides "de" before a vowel or a mute h: "d’avril", "d’août", "d’octobre". */
const ELIDES = /^[aeiouyhàâäéèêëîïôöûüœ]/i;

/**
 * The month of a date as the end of a top row title: "d’octobre" or "de mars"
 * in French, the bare month name ("October") in other languages.
 */
export function getMonthPhrase(locale: string | undefined, date: Date): string {
    const language = (locale || 'en').replace('_', '-').toLowerCase();
    let month: string;
    try {
        month = new Intl.DateTimeFormat(language, { month: 'long' }).format(date);
    } catch {
        month = new Intl.DateTimeFormat('en', { month: 'long' }).format(date);
    }
    if (language === 'fr' || language.startsWith('fr-')) {
        return ELIDES.test(month) ? `d’${month}` : `de ${month}`;
    }
    return month;
}

/**
 * The titles of a top row: the first ones of the ranking, each once, only the
 * ones with a poster (a rank on a blank tile reads as a glitch).
 */
export function selectTopTen(items: CatalogItem[] | undefined, count = TOP_COUNT): CatalogItem[] {
    if (!items) return [];
    const keys = new Set<string>();
    const top: CatalogItem[] = [];
    for (const item of items) {
        if (top.length >= count) break;
        if (!item.ImageUrl && !item.LocalItemId) continue;
        if (keys.has(item.Key)) continue;
        keys.add(item.Key);
        top.push(item);
    }
    return top;
}
