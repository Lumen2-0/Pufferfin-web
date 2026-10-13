import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { appHost } from 'components/apphost';
import { AppFeature } from 'constants/appFeature';
import { useApi } from 'hooks/useApi';
import { useQuickConnectEnabled } from 'hooks/useQuickConnect';
import shell from 'scripts/shell';
import Dashboard from 'utils/dashboard';

import { getAvatarUrl } from '../settings/api';
import { openSettings } from '../settings/store';
import { getAccountEntries, getAdminEntries, type MenuActionId, type MenuEntry } from './utils/menu';

const MENU_ACTIONS: Record<MenuActionId, () => void> = {
    settings: () => openSettings(),
    downloadManager: () => shell.openDownloadManager(),
    clientSettings: () => shell.openClientSettings(),
    selectServer: () => Dashboard.selectServer(),
    signOut: () => Dashboard.logout(),
    exitApp: () => appHost.exit()
};

/**
 * The entries of the account menu, shared by the dropdown of the top bar and
 * the Profile sheet of the bottom bar: the account, then the administration
 * for an administrator, and what choosing one does.
 */
export function useMenuEntries() {
    const { api, user } = useApi();
    const navigate = useNavigate();
    const { data: isQuickConnectEnabled } = useQuickConnectEnabled();

    const context = useMemo(() => ({
        userId: user?.Id,
        isAdministrator: !!user?.Policy?.IsAdministrator,
        isQuickConnectEnabled: !!isQuickConnectEnabled,
        supportsDownloadManager: appHost.supports(AppFeature.DownloadManagement),
        supportsClientSettings: appHost.supports(AppFeature.ClientSettings),
        supportsMultiServer: appHost.supports(AppFeature.MultiServer),
        supportsExit: appHost.supports(AppFeature.ExitMenu)
    }), [ user, isQuickConnectEnabled ]);
    const accountEntries = useMemo(() => getAccountEntries(context), [ context ]);
    const adminEntries = useMemo(() => getAdminEntries(context), [ context ]);

    const choose = useCallback((entry: MenuEntry) => {
        if (entry.kind === 'link') navigate(entry.path);
        else MENU_ACTIONS[entry.id]();
    }, [ navigate ]);

    return {
        userName: user?.Name ?? undefined,
        // The account picture, when the user has one
        avatarUrl: getAvatarUrl(api, user),
        accountEntries,
        adminEntries,
        choose
    };
}
