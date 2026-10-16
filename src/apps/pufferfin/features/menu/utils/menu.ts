import type { StringKey } from '../../../i18n/translate';
import { getStatsPath } from '../../../routes/paths';

/** Destination inside the client, reached through the router. */
export interface MenuLink {
    kind: 'link'
    id: string
    labelKey: StringKey
    path: string
}

/** Action handed to the upstream shell: sign out, switch server, exit. */
export interface MenuAction {
    kind: 'action'
    id: MenuActionId
    labelKey: StringKey
}

export type MenuEntry = MenuLink | MenuAction;

export type MenuActionId = 'settings' | 'contentManager' | 'downloadManager' | 'clientSettings' | 'selectServer' | 'signOut' | 'exitApp';

export interface MenuContext {
    userId?: string
    isAdministrator: boolean
    isQuickConnectEnabled: boolean
    /** Features of the host app: the browser has none of them, the native shells some. */
    supportsDownloadManager: boolean
    supportsClientSettings: boolean
    supportsMultiServer: boolean
    supportsExit: boolean
}

/**
 * Account entries, in the order of the upstream user menu, so nothing the
 * upstream header offered is lost on the Pufferfin screens.
 */
export function getAccountEntries(context: MenuContext): MenuEntry[] {
    const entries: MenuEntry[] = [];

    // One settings window: the profile at its top, every setting, Quick Connect
    entries.push({ kind: 'action', id: 'settings', labelKey: 'MenuSettings' });
    entries.push({ kind: 'link', id: 'stats', labelKey: 'MenuStats', path: getStatsPath() });
    if (context.supportsDownloadManager) {
        entries.push({ kind: 'action', id: 'downloadManager', labelKey: 'MenuDownloadManager' });
    }
    if (context.supportsClientSettings) {
        entries.push({ kind: 'action', id: 'clientSettings', labelKey: 'MenuClientSettings' });
    }

    return entries;
}

/** The end of the menu, after the administration: change server, sign out, exit. */
export function getSessionEntries(context: MenuContext): MenuEntry[] {
    const entries: MenuEntry[] = [];
    if (context.supportsMultiServer) {
        entries.push({ kind: 'action', id: 'selectServer', labelKey: 'MenuSelectServer' });
    }
    entries.push({ kind: 'action', id: 'signOut', labelKey: 'MenuSignOut' });
    if (context.supportsExit) {
        entries.push({ kind: 'action', id: 'exitApp', labelKey: 'MenuExitApp' });
    }
    return entries;
}

/** Administration entries: empty for a user who is not an administrator. */
export function getAdminEntries(context: MenuContext): MenuEntry[] {
    if (!context.isAdministrator) return [];
    return [
        { kind: 'link', id: 'dashboard', labelKey: 'MenuDashboard', path: '/dashboard' },
        // Every title on disk with its torrents, deleted now or seven days later
        { kind: 'action', id: 'contentManager', labelKey: 'MenuContentManager' },
        { kind: 'link', id: 'metadata', labelKey: 'MenuMetadataManager', path: '/metadata' }
    ];
}
