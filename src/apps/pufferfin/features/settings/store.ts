import { useSyncExternalStore } from 'react';

/** The sections of the settings window, in their order in its side list; the profile comes first. */
export enum SettingsSection {
    Profile = 'profile',
    Preferences = 'preferences',
    Playback = 'playback',
    Subtitles = 'subtitles',
    Downloads = 'downloads',
    Interface = 'interface',
    Devices = 'devices'
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
    SettingsSection.Profile,
    SettingsSection.Preferences,
    SettingsSection.Playback,
    SettingsSection.Subtitles,
    SettingsSection.Downloads,
    SettingsSection.Interface,
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
