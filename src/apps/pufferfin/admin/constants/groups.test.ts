import { describe, expect, it } from 'vitest';

import { PufferfinService } from 'apps/pufferfin/api/types';
import enUs from 'apps/pufferfin/i18n/strings/en-us.json';

import { SETTINGS_GROUPS } from './groups';

// The keys of the server contract that belong to no service. Keep in sync with
// `src/Pufferfin.Server/Configuration/SettingKeys.cs` in Pufferfin/Pufferfin.
const GENERAL_KEYS = [
    'TMDB_LANGUAGES',
    'PREFERRED_AUDIO_LANGUAGES',
    'AUDIBLE_MARKETS',
    'REJECT_SUBTITLED_ONLY',
    'SEED_MIN_DAYS',
    'SEED_MAX_DAYS',
    'SEED_TARGET_RATIO',
    'SEED_CATEGORIES',
    'MAX_CONCURRENT_DOWNLOADS',
    'MEDIA_PATH',
    'DOWNLOADS_PATH',
    'STORAGE_WARNING_PERCENT'
];

// The keys of the server contract that belong to a service.
const SERVICE_KEYS = [
    'RADARR_URL',
    'RADARR_API_KEY',
    'SONARR_URL',
    'SONARR_API_KEY',
    'PROWLARR_URL',
    'PROWLARR_API_KEY',
    'QBITTORRENT_URL',
    'QBITTORRENT_USERNAME',
    'QBITTORRENT_PASSWORD',
    'BAZARR_URL',
    'BAZARR_API_KEY',
    'SHELFMARK_URL',
    'TMDB_API_KEY',
    'FLARESOLVERR_URL',
    'QBITTORRENT_DOWNLOADS_PATH'
];

const strings: Record<string, string> = enUs;

describe('SETTINGS_GROUPS', () => {
    it('places every service on exactly one page', () => {
        Object.values(PufferfinService).forEach(service => {
            expect(SETTINGS_GROUPS.filter(group => group.services.includes(service))).toHaveLength(1);
        });
    });

    it('places every general setting on exactly one page', () => {
        GENERAL_KEYS.forEach(key => {
            expect(SETTINGS_GROUPS.filter(group => group.settings.includes(key))).toHaveLength(1);
        });

        const listed = SETTINGS_GROUPS.reduce<string[]>((all, group) => all.concat(group.settings), []);
        listed.sort((a, b) => a.localeCompare(b));
        const expected = [ ...GENERAL_KEYS ];
        expected.sort((a, b) => a.localeCompare(b));
        expect(listed).toEqual(expected);
    });

    it('has a title and a description for every page', () => {
        SETTINGS_GROUPS.forEach(group => {
            expect(strings[`Group.${group.id}`]).toBeTruthy();
            expect(strings[`Group.${group.id}.Description`]).toBeTruthy();
        });
    });

    it('has a label and a help text for every setting', () => {
        [ ...GENERAL_KEYS, ...SERVICE_KEYS ].forEach(key => {
            expect(strings[`Setting.${key}`]).toBeTruthy();
            expect(strings[`Setting.${key}.Help`]).toBeTruthy();
        });
    });
});
