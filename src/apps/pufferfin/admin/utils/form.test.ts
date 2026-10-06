// Setting keys are the environment variable names of the server contract, and the URLs are addresses of
// services on a private network: both are what the code under test receives.
/* eslint-disable @typescript-eslint/naming-convention, sonarjs/no-clear-text-protocols */
import { describe, expect, it, vi } from 'vitest';

// The real module pulls the whole client bootstrap. English is the current language.
vi.mock('lib/globalize', () => ({
    getLanguages: () => [ 'en-us' ],
    normalizeLocaleName: (locale: string) => locale.toLowerCase()
}));

import { PufferfinService, type PufferfinSetting, SettingKind, SettingSource } from 'apps/pufferfin/api/types';

import { buildUpdate, clearSecretDrafts, toDrafts, toServerFieldErrors, validateUpdate } from './form';

const setting = (key: string, type: SettingKind, overrides: Partial<PufferfinSetting> = {}): PufferfinSetting => ({
    Key: key,
    Type: type,
    IsSecret: type === SettingKind.Secret,
    Value: null,
    IsSet: false,
    Source: SettingSource.Unset,
    IsReadOnly: false,
    EnvironmentIgnored: false,
    ...overrides
});

const radarrUrl = setting('RADARR_URL', SettingKind.Url, {
    Service: PufferfinService.Radarr,
    Value: 'http://radarr:7878',
    IsSet: true,
    Source: SettingSource.Store
});
const radarrKey = setting('RADARR_API_KEY', SettingKind.Secret, {
    Service: PufferfinService.Radarr,
    IsSet: true,
    Source: SettingSource.Store
});
const languages = setting('PREFERRED_AUDIO_LANGUAGES', SettingKind.LanguageList, {
    Value: [ 'fr', 'en' ],
    IsSet: true,
    Source: SettingSource.Store
});
const rejectSubtitled = setting('REJECT_SUBTITLED_ONLY', SettingKind.Boolean);
const seedMinDays = setting('SEED_MIN_DAYS', SettingKind.Integer, { Value: 5, IsSet: true, Source: SettingSource.Store });
const seedMaxDays = setting('SEED_MAX_DAYS', SettingKind.Integer);
const ratio = setting('SEED_TARGET_RATIO', SettingKind.Decimal);

const ALL = [ radarrUrl, radarrKey, languages, rejectSubtitled, seedMinDays, seedMaxDays, ratio ];

const mediaPath = setting('MEDIA_PATH', SettingKind.Path, { Value: '/media', IsSet: true, Source: SettingSource.Store });
const warningPercent = setting('STORAGE_WARNING_PERCENT', SettingKind.Integer);
const STORAGE = [ mediaPath, warningPercent ];

describe('toDrafts', () => {
    it('never puts a secret value in the form', () => {
        const drafts = toDrafts([ { ...radarrKey, Value: 'leaked' } ]);

        expect(drafts.RADARR_API_KEY).toBe('');
    });

    it('formats lists, numbers and booleans', () => {
        expect(toDrafts(ALL)).toEqual({
            RADARR_URL: 'http://radarr:7878',
            RADARR_API_KEY: '',
            PREFERRED_AUDIO_LANGUAGES: 'fr, en',
            REJECT_SUBTITLED_ONLY: 'false',
            SEED_MIN_DAYS: '5',
            SEED_MAX_DAYS: '',
            SEED_TARGET_RATIO: ''
        });
    });
});

describe('buildUpdate', () => {
    it('sends nothing when nothing changed', () => {
        expect(buildUpdate(ALL, toDrafts(ALL), [])).toEqual({});
    });

    it('ignores formatting only changes of a list', () => {
        const drafts = { ...toDrafts(ALL), PREFERRED_AUDIO_LANGUAGES: 'fr,en ' };

        expect(buildUpdate(ALL, drafts, [])).toEqual({});
    });

    it('sends only the changed settings, typed by kind', () => {
        const drafts = {
            ...toDrafts(ALL),
            PREFERRED_AUDIO_LANGUAGES: 'en, fr',
            REJECT_SUBTITLED_ONLY: 'true',
            SEED_MAX_DAYS: '30',
            SEED_TARGET_RATIO: '1.5'
        };

        expect(buildUpdate(ALL, drafts, [])).toEqual({
            PREFERRED_AUDIO_LANGUAGES: [ 'en', 'fr' ],
            REJECT_SUBTITLED_ONLY: true,
            SEED_MAX_DAYS: 30,
            SEED_TARGET_RATIO: 1.5
        });
    });

    it('clears a value emptied in the form', () => {
        const drafts = { ...toDrafts(ALL), RADARR_URL: '  ' };

        expect(buildUpdate(ALL, drafts, [])).toEqual({ RADARR_URL: null });
    });

    it('keeps a stored secret when its field is left blank', () => {
        expect(buildUpdate([ radarrKey ], { RADARR_API_KEY: '' }, [])).toEqual({});
    });

    it('replaces a secret with a new value', () => {
        expect(buildUpdate([ radarrKey ], { RADARR_API_KEY: 'new-key' }, [])).toEqual({ RADARR_API_KEY: 'new-key' });
    });

    it('clears a secret only when asked explicitly', () => {
        expect(buildUpdate([ radarrKey ], { RADARR_API_KEY: '' }, [ 'RADARR_API_KEY' ])).toEqual({ RADARR_API_KEY: null });
    });

    it('never sends a read only setting', () => {
        const locked = { ...radarrUrl, IsReadOnly: true, Source: SettingSource.Environment };
        const lockedKey = { ...radarrKey, IsReadOnly: true, Source: SettingSource.Environment };

        expect(buildUpdate(
            [ locked, lockedKey ],
            { RADARR_URL: 'http://other', RADARR_API_KEY: 'new-key' },
            [ 'RADARR_API_KEY' ]
        )).toEqual({});
    });
});

describe('validateUpdate', () => {
    it('accepts valid values', () => {
        expect(validateUpdate(ALL, {
            RADARR_URL: 'https://radarr.example.org/base',
            PREFERRED_AUDIO_LANGUAGES: [ 'fr', 'pt-BR' ],
            SEED_MAX_DAYS: 10
        })).toEqual({});
    });

    it.each([
        'radarr:7878',
        'ftp://radarr',
        'http://user:pass@radarr',
        'http://radarr?apikey=1',
        'http://radarr#top'
    ])('rejects the URL %s', url => {
        expect(Object.keys(validateUpdate(ALL, { RADARR_URL: url }))).toEqual([ 'RADARR_URL' ]);
    });

    it('rejects an invalid language code', () => {
        expect(Object.keys(validateUpdate(ALL, { PREFERRED_AUDIO_LANGUAGES: [ 'french' ] })))
            .toEqual([ 'PREFERRED_AUDIO_LANGUAGES' ]);
    });

    it('rejects a number that is not a number or below its minimum', () => {
        const drafts = { ...toDrafts(ALL), SEED_TARGET_RATIO: 'abc', SEED_MIN_DAYS: '-1' };
        const update = buildUpdate(ALL, drafts, []);

        expect(Object.keys(validateUpdate(ALL, update)).sort((a, b) => a.localeCompare(b)))
            .toEqual([ 'SEED_MIN_DAYS', 'SEED_TARGET_RATIO' ]);
    });

    it('rejects a whole number with decimals', () => {
        const update = buildUpdate(ALL, { ...toDrafts(ALL), SEED_MAX_DAYS: '1.5' }, []);

        expect(Object.keys(validateUpdate(ALL, update))).toEqual([ 'SEED_MAX_DAYS' ]);
    });

    it('rejects a maximum seeding time below the stored minimum', () => {
        expect(Object.keys(validateUpdate(ALL, { SEED_MAX_DAYS: 2 }))).toEqual([ 'SEED_MAX_DAYS' ]);
    });

    it('sends a path as text', () => {
        expect(buildUpdate(STORAGE, { ...toDrafts(STORAGE), MEDIA_PATH: ' /data/media ' }, []))
            .toEqual({ MEDIA_PATH: '/data/media' });
    });

    it.each([ '/media', '/data/media/', 'C:\\media', '\\\\nas\\media' ])('accepts the path %s', path => {
        expect(validateUpdate(STORAGE, { MEDIA_PATH: path })).toEqual({});
    });

    it.each([ 'media', './media', '/data/../etc', 'C:media' ])('rejects the path %s', path => {
        expect(Object.keys(validateUpdate(STORAGE, { MEDIA_PATH: path }))).toEqual([ 'MEDIA_PATH' ]);
    });

    it.each([ 0, 101 ])('rejects a disk usage warning of %d percent', percent => {
        expect(Object.keys(validateUpdate(STORAGE, { STORAGE_WARNING_PERCENT: percent }))).toEqual([ 'STORAGE_WARNING_PERCENT' ]);
    });

    it('accepts a disk usage warning between 1 and 100 percent', () => {
        expect(validateUpdate(STORAGE, { STORAGE_WARNING_PERCENT: 100 })).toEqual({});
    });
});

describe('clearSecretDrafts', () => {
    it('blanks secrets and keeps the other fields', () => {
        expect(clearSecretDrafts({ RADARR_URL: 'http://radarr', RADARR_API_KEY: 'typed' }, [ radarrUrl, radarrKey ]))
            .toEqual({ RADARR_URL: 'http://radarr', RADARR_API_KEY: '' });
    });
});

describe('toServerFieldErrors', () => {
    it('flags the rejected fields of the page without showing the server message', () => {
        const errors = toServerFieldErrors({ RADARR_URL: [ 'RADARR_URL must be an absolute URL.' ], OTHER: [ 'x' ] }, [ 'RADARR_URL' ]);

        expect(Object.keys(errors)).toEqual([ 'RADARR_URL' ]);
        expect(errors.RADARR_URL).not.toContain('RADARR_URL must');
    });
});
/* eslint-enable @typescript-eslint/naming-convention, sonarjs/no-clear-text-protocols */
