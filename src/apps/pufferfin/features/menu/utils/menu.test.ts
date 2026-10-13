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
    it('always offers the settings window and sign out', () => {
        expect(ids(getAccountEntries(BROWSER_USER))).toEqual([ 'settings', 'signOut' ]);
    });

    it('opens the settings as a window, the profile at its top, not as a page', () => {
        expect(getAccountEntries(BROWSER_USER)[0]).toMatchObject({ kind: 'action', id: 'settings' });
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
            'settings', 'downloadManager', 'clientSettings', 'selectServer', 'signOut', 'exitApp'
        ]);
    });

    it('shows the administration entries to administrators only', () => {
        expect(getAdminEntries(BROWSER_USER)).toEqual([]);
        expect(ids(getAdminEntries({ ...BROWSER_USER, isAdministrator: true }))).toEqual([ 'dashboard', 'metadata', 'contentManager' ]);
    });
});
