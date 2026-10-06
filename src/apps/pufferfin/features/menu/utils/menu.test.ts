import { describe, expect, it } from 'vitest';

import { getAccountEntries, getAdminEntries, type MenuContext } from './menu';

const BROWSER_USER: MenuContext = {
    userId: 'user',
    isAdministrator: false,
    isQuickConnectEnabled: false,
    supportsDownloadManager: false,
    supportsClientSettings: false,
    supportsMultiServer: false,
    supportsExit: false
};

const ids = (entries: { id: string }[]) => entries.map(entry => entry.id);

describe('Pufferfin: menu', () => {
    it('always offers the profile, the settings and sign out', () => {
        expect(ids(getAccountEntries(BROWSER_USER))).toEqual([ 'profile', 'settings', 'signOut' ]);
    });

    it('links the profile of the signed in user', () => {
        const profile = getAccountEntries(BROWSER_USER)[0];
        expect(profile).toMatchObject({ kind: 'link', path: '/userprofile?userId=user' });
    });

    it('adds the host features only when the host supports them', () => {
        const entries = getAccountEntries({
            ...BROWSER_USER,
            isQuickConnectEnabled: true,
            supportsDownloadManager: true,
            supportsClientSettings: true,
            supportsMultiServer: true,
            supportsExit: true
        });
        expect(ids(entries)).toEqual([
            'profile', 'settings', 'downloadManager', 'clientSettings', 'quickConnect', 'selectServer', 'signOut', 'exitApp'
        ]);
    });

    it('shows the administration entries to administrators only', () => {
        expect(getAdminEntries(BROWSER_USER)).toEqual([]);
        expect(ids(getAdminEntries({ ...BROWSER_USER, isAdministrator: true }))).toEqual([ 'dashboard', 'metadata' ]);
    });
});
