import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';

// The real module pulls the whole client bootstrap. English is the current language.
vi.mock('lib/globalize', () => ({
    getLanguages: () => [ 'en-us' ],
    normalizeLocaleName: (locale: string) => locale.toLowerCase()
}));

import { translate } from '.';
import enUs from './strings/en-us.json';

const STRINGS_DIR = join(__dirname, 'strings');
// En dash and em dash, which Pufferfin texts never use.
const DASHES = new RegExp('[\\u2013\\u2014]');
const sourceKeys = Object.keys(enUs).sort((a, b) => a.localeCompare(b));

describe('translate', () => {
    it('returns the English source by default', () => {
        expect(translate('ButtonSave')).toBe('Save');
    });

    it('replaces the placeholders', () => {
        expect(translate('ValidationMinimum', 3)).toBe('Enter a value of at least 3.');
    });
});

describe('dictionaries', () => {
    const files = readdirSync(STRINGS_DIR).filter(file => file.endsWith('.json'));

    it.each(files)('%s has exactly the keys of the English source', file => {
        const dictionary = JSON.parse(readFileSync(join(STRINGS_DIR, file), 'utf8')) as Record<string, string>;

        expect(Object.keys(dictionary).sort((a, b) => a.localeCompare(b))).toEqual(sourceKeys);
    });

    it.each(files)('%s has no empty string and no em or en dash', file => {
        const dictionary = JSON.parse(readFileSync(join(STRINGS_DIR, file), 'utf8')) as Record<string, string>;

        Object.values(dictionary).forEach(value => {
            expect(value.trim()).not.toBe('');
            expect(value).not.toMatch(DASHES);
        });
    });
});
