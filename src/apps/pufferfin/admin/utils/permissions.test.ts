import { describe, expect, it, vi } from 'vitest';

// The real module pulls the whole client bootstrap. English is the current language.
vi.mock('lib/globalize', () => ({
    getLanguages: () => [ 'en-us' ],
    normalizeLocaleName: (locale: string) => locale.toLowerCase()
}));

import { describePermissions, parseQuota } from './permissions';

describe('parseQuota', () => {
    it('reads an empty field as no limit', () => {
        expect(parseQuota('  ')).toBeNull();
    });

    it.each([ [ '0', 0 ], [ ' 10 ', 10 ] ])('reads %s', (text, expected) => {
        expect(parseQuota(text)).toBe(expected);
    });

    it.each([ '-1', '1.5', 'ten', '10000000' ])('rejects %s', text => {
        expect(parseQuota(text)).toBeUndefined();
    });
});

describe('describePermissions', () => {
    const base = { CanRequest: true, RequiresApproval: false, CanDelete: false, UsedThisWeek: 2, IsAdministrator: false };

    it('describes the quota and the deletion right', () => {
        expect(describePermissions({ ...base, WeeklyQuota: 10 })).toEqual([
            'Requests start without approval',
            '2 of 10 requests used this week',
            'May not delete titles'
        ]);
    });

    it('says when a user may not request', () => {
        expect(describePermissions({ ...base, CanRequest: false, CanDelete: true })).toEqual([
            'May not request titles',
            'May delete titles, with the safe mode'
        ]);
    });

    it('sums up an administrator in one line', () => {
        expect(describePermissions({ ...base, IsAdministrator: true })).toHaveLength(1);
    });
});
