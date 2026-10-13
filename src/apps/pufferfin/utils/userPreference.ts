import { useCallback, useSyncExternalStore } from 'react';

import { currentSettings as userSettings } from 'scripts/settings/userSettings';
import Events from 'utils/events';

/**
 * A preference of the user kept with their display preferences on the
 * server, so it follows them from one device to another. Every component
 * reading it changes as soon as it is set, here or anywhere else.
 */
export function useUserPreference(name: string): [ string | null, (value: string | null) => void ] {
    const subscribe = useCallback((onChange: () => void) => {
        const onSettingsChange = (_event: unknown, changed: string) => {
            if (changed === name) onChange();
        };
        Events.on(userSettings, 'change', onSettingsChange);
        return () => Events.off(userSettings, 'change', onSettingsChange);
    }, [ name ]);
    const read = useCallback(() => (userSettings.get(name) as string | null | undefined) ?? null, [ name ]);
    const value = useSyncExternalStore(subscribe, read);

    const setValue = useCallback((next: string | null) => {
        userSettings.set(name, next ?? '');
    }, [ name ]);

    return [ value || null, setValue ];
}
