import { useSyncExternalStore } from 'react';

/** The sections of the settings window, in their order in its side list; the profile comes first. */
export enum SettingsSection {
    Profile = 'profile',
    Interface = 'interface',
    Playback = 'playback',
    Preferences = 'preferences',
    Downloads = 'downloads',
    Devices = 'devices'
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
    SettingsSection.Profile,
    SettingsSection.Interface,
    SettingsSection.Playback,
    SettingsSection.Preferences,
    SettingsSection.Downloads,
    SettingsSection.Devices
];

/** The section shown, or none when the window is closed. One window for the whole interface. */
let openSection: SettingsSection | undefined;
const listeners = new Set<() => void>();

const set = (value: SettingsSection | undefined) => {
    if (openSection === value) return;
    openSection = value;
    listeners.forEach(listener => {
        listener();
    });
};

export const openSettings = (section: SettingsSection = SettingsSection.Profile) => set(section);
export const closeSettings = () => set(undefined);

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const useOpenSettingsSection = () => useSyncExternalStore(subscribe, () => openSection);
