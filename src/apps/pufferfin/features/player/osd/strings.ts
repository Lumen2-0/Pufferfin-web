import globalize from 'lib/globalize';

import { type StringKey, loadLocale, translate } from '../../../i18n/translate';

/**
 * Pufferfin words for the upstream player, which renders outside React: the
 * language of the interface, the English source as the fallback.
 */
export function playerText(key: StringKey, ...args: Array<string | number>): string {
    return translate(globalize.getCurrentLocale(), key, ...args);
}

/** Loads the words of the interface language, in case the player opens before any Pufferfin screen. */
export function loadPlayerText(): Promise<void> {
    return loadLocale(globalize.getCurrentLocale()).catch(() => undefined);
}
