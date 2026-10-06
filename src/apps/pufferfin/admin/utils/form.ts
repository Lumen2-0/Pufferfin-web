import { type PufferfinSetting, SettingKind, type SettingValue } from 'apps/pufferfin/api/types';
import { translate } from 'apps/pufferfin/i18n';

/**
 * The values of the fields as edited in the form, by setting key. A boolean is `'true'` or `'false'`.
 * Secrets start blank: their value is never received.
 */
export type Drafts = Record<string, string>;

/** Error messages by setting key, already translated. */
export type FieldErrors = Record<string, string>;

export type SettingsUpdate = Record<string, SettingValue | null>;

const MAX_TEXT_LENGTH = 4096;
const INTEGER_REGEX = /^[+-]?\d+$/;
const DECIMAL_REGEX = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;
const LANGUAGE_CODE_REGEX = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
const IDENTIFIER_REGEX = /^[A-Za-z0-9_-]{1,32}$/;

// Client side validation is a comfort only: the server validates every value again. These minimums mirror the
// server definitions so that a mistake is reported before the round trip.
const MINIMUMS = new Map<string, number>([
    [ 'SEED_MIN_DAYS', 0 ],
    [ 'SEED_MAX_DAYS', 0 ],
    [ 'SEED_TARGET_RATIO', 0 ],
    [ 'MAX_CONCURRENT_DOWNLOADS', 1 ],
    [ 'STORAGE_WARNING_PERCENT', 1 ]
]);

const MAXIMUMS = new Map<string, number>([
    [ 'STORAGE_WARNING_PERCENT', 100 ]
]);

// Same rule as the server: '/' starts an absolute path even on a Windows server, because the services run in Linux
// containers. A Windows path needs a drive and a separator, or is a UNC path.
const ABSOLUTE_PATH_REGEX = /^(\/|[A-Za-z]:[\\/]|\\\\)/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER_REGEX = /[\u0000-\u001f\u007f]/;

export const isListKind = (kind: SettingKind) => kind === SettingKind.LanguageList || kind === SettingKind.TextList;

export const parseList = (text: string) => text.split(',').map(item => item.trim()).filter(item => item.length > 0);

/** The initial form value of a setting. A secret is always blank. */
export const toDraftValue = (setting: PufferfinSetting): string => {
    const value = setting.Value;

    if (setting.IsSecret || value === null || value === undefined) {
        return setting.Type === SettingKind.Boolean ? 'false' : '';
    }

    return Array.isArray(value) ? value.join(', ') : String(value);
};

export const toDrafts = (settings: PufferfinSetting[]): Drafts => {
    const drafts: Drafts = {};
    settings.forEach(setting => {
        drafts[setting.Key] = toDraftValue(setting);
    });
    return drafts;
};

/** Blanks every secret field. */
export const clearSecretDrafts = (drafts: Drafts, settings: PufferfinSetting[]): Drafts => {
    const next = { ...drafts };
    settings.forEach(setting => {
        if (setting.IsSecret) next[setting.Key] = '';
    });
    return next;
};

const isUnchanged = (setting: PufferfinSetting, draft: string) => {
    const initial = toDraftValue(setting);

    if (isListKind(setting.Type)) return parseList(draft).join(',') === parseList(initial).join(',');

    return draft.trim() === initial.trim();
};

// The value sent to the API is typed by the kind of the setting.
// eslint-disable-next-line sonarjs/function-return-type
const toSettingValue = (kind: SettingKind, draft: string): SettingValue | null => {
    const text = draft.trim();

    if (kind === SettingKind.Boolean) return text === 'true';
    if (!text) return null;

    switch (kind) {
        case SettingKind.Integer:
            return INTEGER_REGEX.test(text) ? parseInt(text, 10) : Number.NaN;
        case SettingKind.Decimal:
            return DECIMAL_REGEX.test(text) ? parseFloat(text) : Number.NaN;
        case SettingKind.LanguageList:
        case SettingKind.TextList:
            return parseList(text);
        default:
            return text;
    }
};

/**
 * Builds the update to send: only the settings that changed. Read only settings are never sent.
 * A blank secret field keeps the stored secret; a cleared secret is sent as `null`.
 */
export const buildUpdate = (settings: PufferfinSetting[], drafts: Drafts, clearedSecrets: string[]): SettingsUpdate => {
    const update: SettingsUpdate = {};

    settings.forEach(setting => {
        if (setting.IsReadOnly || !(setting.Key in drafts)) return;

        const draft = drafts[setting.Key];

        if (setting.IsSecret) {
            if (clearedSecrets.includes(setting.Key)) {
                if (setting.IsSet) update[setting.Key] = null;
            } else if (draft.trim()) {
                update[setting.Key] = draft;
            }
            return;
        }

        if (isUnchanged(setting, draft)) return;

        update[setting.Key] = toSettingValue(setting.Type, draft);
    });

    return update;
};

const isValidUrl = (text: string) => {
    let url: URL;
    try {
        url = new URL(text);
    } catch {
        return false;
    }

    return (url.protocol === 'http:' || url.protocol === 'https:')
        && !!url.hostname
        && !url.username
        && !url.password
        && !url.search
        && !url.hash;
};

const validateNumber = (setting: PufferfinSetting, value: number): string | undefined => {
    if (Number.isNaN(value)) {
        return translate(setting.Type === SettingKind.Integer ? 'ValidationInteger' : 'ValidationDecimal');
    }

    const minimum = MINIMUMS.get(setting.Key);
    if (minimum !== undefined && value < minimum) return translate('ValidationMinimum', minimum);

    const maximum = MAXIMUMS.get(setting.Key);
    return maximum !== undefined && value > maximum ? translate('ValidationMaximum', maximum) : undefined;
};

const isValidPath = (text: string) => (
    ABSOLUTE_PATH_REGEX.test(text)
    && !CONTROL_CHARACTER_REGEX.test(text)
    && !text.split(/[\\/]/).includes('..')
);

const validateList = (kind: SettingKind, items: string[]): string | undefined => {
    if (kind === SettingKind.LanguageList) {
        return items.every(item => LANGUAGE_CODE_REGEX.test(item)) ? undefined : translate('ValidationLanguageList');
    }

    return items.every(item => IDENTIFIER_REGEX.test(item)) ? undefined : translate('ValidationTextList');
};

/** Validates the value about to be sent for a setting. Returns a translated message when it is invalid. */
export const validateValue = (setting: PufferfinSetting, value: SettingValue | null): string | undefined => {
    if (value === null || typeof value === 'boolean') return undefined;
    if (typeof value === 'number') return validateNumber(setting, value);
    if (Array.isArray(value)) return validateList(setting.Type, value);
    if (value.length > MAX_TEXT_LENGTH) return translate('ValidationTooLong');
    if (setting.Type === SettingKind.Url && !isValidUrl(value)) return translate('ValidationUrl');
    if (setting.Type === SettingKind.Path && !isValidPath(value)) return translate('ValidationPath');

    return undefined;
};

const getEffectiveNumber = (settings: PufferfinSetting[], update: SettingsUpdate, key: string): number | null => {
    const value = key in update ? update[key] : settings.find(setting => setting.Key === key)?.Value;
    return typeof value === 'number' && !Number.isNaN(value) ? value : null;
};

/** Validates the changed values. Returns translated messages by setting key; empty when valid. */
export const validateUpdate = (settings: PufferfinSetting[], update: SettingsUpdate): FieldErrors => {
    const errors: FieldErrors = {};

    settings.forEach(setting => {
        if (!(setting.Key in update)) return;

        const message = validateValue(setting, update[setting.Key]);
        if (message) errors[setting.Key] = message;
    });

    // Same cross field rule as the server: the maximum seeding time cannot be below the minimum.
    const isSeedChanged = 'SEED_MIN_DAYS' in update || 'SEED_MAX_DAYS' in update;
    const minDays = getEffectiveNumber(settings, update, 'SEED_MIN_DAYS');
    const maxDays = getEffectiveNumber(settings, update, 'SEED_MAX_DAYS');
    if (isSeedChanged && !errors.SEED_MAX_DAYS && minDays !== null && maxDays !== null && maxDays < minDays) {
        errors.SEED_MAX_DAYS = translate('ValidationSeedMaxDays');
    }

    return errors;
};

/** Maps the errors of a 400 response to translated messages on the matching fields. */
export const toServerFieldErrors = (errors: Record<string, string[]> | undefined, keys: string[]): FieldErrors => {
    const fieldErrors: FieldErrors = {};

    // The server messages are in English and are not shown: each rejected field gets a translated message.
    Object.keys(errors ?? {}).forEach(key => {
        if (keys.includes(key)) fieldErrors[key] = translate('ValidationRejected');
    });

    return fieldErrors;
};
