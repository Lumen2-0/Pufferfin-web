import React, { type FC, type PropsWithChildren, createContext, useCallback, useContext, useEffect, useState } from 'react';

import { EventType } from 'constants/eventType';
import globalize from 'lib/globalize';
import Events from 'utils/events';

import { type StringKey, FALLBACK_LOCALE, loadLocale, translate } from './translate';

const LocaleContext = createContext<string>(FALLBACK_LOCALE);

/**
 * Follows the interface language chosen in the user settings and loads the
 * matching Pufferfin dictionary. Children render right away with the English
 * fallback, then re-render once the dictionary is loaded.
 */
export const TranslationProvider: FC<PropsWithChildren<unknown>> = ({ children }) => {
    const [ locale, setLocale ] = useState(FALLBACK_LOCALE);

    useEffect(() => {
        let isCurrent = true;

        const update = () => {
            const current = globalize.getCurrentLocale() || FALLBACK_LOCALE;
            loadLocale(current)
                .then(() => {
                    if (isCurrent) setLocale(current);
                })
                .catch(err => {
                    console.error('[Pufferfin] Failed to load strings', err);
                });
        };

        update();
        Events.on(document, EventType.LANGUAGE_CHANGE, update);

        return () => {
            isCurrent = false;
            Events.off(document, EventType.LANGUAGE_CHANGE, update);
        };
    }, []);

    return (
        <LocaleContext.Provider value={locale}>
            {children}
        </LocaleContext.Provider>
    );
};

/** Returns a translate function bound to the current interface language. */
export function useTranslation() {
    const locale = useContext(LocaleContext);
    return useCallback(
        (key: StringKey, ...args: Array<string | number>) => translate(locale, key, ...args),
        [ locale ]
    );
}
