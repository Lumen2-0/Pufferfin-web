import type { GroupInfoDto } from '@jellyfin/sdk/lib/generated-client/models/group-info-dto';
import type { ApiClient } from 'jellyfin-apiclient';

import { pluginManager } from 'components/pluginManager';
import { PluginType } from 'constants/pluginType';
import Events from 'utils/events';

/** The parts of the upstream SyncPlay manager the Pufferfin views use. */
export interface SyncPlayManager {
    getGroupInfo: () => GroupInfoDto | null | undefined
    getApiClient: () => ApiClient
    isSyncPlayEnabled: () => boolean
    isFollowingGroupPlayback: () => boolean
    isPlaybackActive: () => boolean
    isPlaylistEmpty: () => boolean
    haltGroupPlayback: (apiClient: ApiClient) => void
    resumeGroupPlayback: (apiClient: ApiClient) => void
    getPlaybackCore: () => {
        enableSyncCorrection?: boolean
        useSpeedToSync?: boolean
        useSkipToSync?: boolean
    }
    getTimeSyncCore: () => { extraTimeOffset?: number }
}

/** What the views show of SyncPlay; a new object on each change. */
export interface SyncPlaySnapshot {
    group?: GroupInfoDto
    /** The last state of the group the server told, and why. */
    state?: string
    reason?: string
    isFollowing: boolean
}

type Listener = () => void;

const listeners = new Set<Listener>();
let snapshot: SyncPlaySnapshot = { isFollowing: true };
let boundManager: SyncPlayManager | null = null;

export function getSyncPlayManager(): SyncPlayManager | undefined {
    return pluginManager.firstOfType(PluginType.SyncPlay)?.instance?.Manager as SyncPlayManager | undefined;
}

function update(next: Partial<SyncPlaySnapshot>) {
    snapshot = { ...snapshot, ...next };
    listeners.forEach(listener => {
        listener();
    });
}

/** Reads the manager again: the group, and whether this client follows it. */
function readManager(manager: SyncPlayManager) {
    const enabled = manager.isSyncPlayEnabled();
    const group = enabled ? manager.getGroupInfo() ?? undefined : undefined;
    update({
        group,
        state: enabled ? snapshot.state ?? group?.State ?? undefined : undefined,
        reason: enabled ? snapshot.reason : undefined,
        isFollowing: manager.isFollowingGroupPlayback()
    });
}

function bind() {
    const manager = getSyncPlayManager();
    if (!manager || manager === boundManager) return;
    boundManager = manager;
    Events.on(manager, 'enabled', (_event: unknown, enabled: boolean) => {
        if (!enabled) update({ state: undefined, reason: undefined });
        readManager(manager);
    });
    Events.on(manager, 'group-update', () => readManager(manager));
    Events.on(manager, 'group-state-update', (_event: unknown, state: string, reason: string) => {
        update({ state, reason, isFollowing: manager.isFollowingGroupPlayback() });
    });
    Events.on(manager, 'playerchange', () => readManager(manager));
    readManager(manager);
}

export const syncPlayStore = {
    getSnapshot: (): SyncPlaySnapshot => {
        bind();
        return snapshot;
    },
    subscribe: (listener: Listener) => {
        bind();
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },
    /** Tells the views that following the group changed: the manager sends no event for it. */
    refresh: () => {
        const manager = getSyncPlayManager();
        if (manager) readManager(manager);
    }
};
