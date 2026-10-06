import { describe, expect, it, vi } from 'vitest';

import { format, getLocaleCandidates, registerDictionary, translate } from './translate';

describe('Pufferfin: translate', () => {
    it('lists the regional locale before its base language', () => {
        expect(getLocaleCandidates('fr-CA')).toEqual([ 'fr-ca', 'fr' ]);
        expect(getLocaleCandidates('pt_BR')).toEqual([ 'pt-br', 'pt' ]);
        expect(getLocaleCandidates('de')).toEqual([ 'de' ]);
        expect(getLocaleCandidates()).toEqual([]);
    });

    it('replaces every positional argument', () => {
        expect(format('S{0}, E{1} of {0}', [ 2, 5 ])).toBe('S2, E5 of 2');
    });

    it('falls back to English when the locale has no dictionary', () => {
        expect(translate('xx-yy', 'ActionPlay')).toBe('Play');
    });

    it('prefers the regional dictionary, then the base language, then English', () => {
        registerDictionary('zz', { ActionPlay: 'Base play', ActionResume: 'Base resume' });
        registerDictionary('zz-rr', { ActionPlay: 'Regional play' });

        expect(translate('zz-RR', 'ActionPlay')).toBe('Regional play');
        expect(translate('zz-RR', 'ActionResume')).toBe('Base resume');
        expect(translate('zz-RR', 'ActionMoreInfo')).toBe('More Info');
    });

    it('formats arguments of the translated string', () => {
        expect(translate('en-us', 'WatchedPercent', 40)).toBe('40% watched');
    });

    it('returns the key when it is missing everywhere', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        // @ts-expect-error Unknown key on purpose
        expect(translate('en-us', 'NotAKey')).toBe('NotAKey');
        expect(error).toHaveBeenCalled();
    });
});
