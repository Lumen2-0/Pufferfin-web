import type { GroupInfoDto } from '@jellyfin/sdk/lib/generated-client/models/group-info-dto';

import { ServerConnections } from 'lib/jellyfin-apiclient';
import { getSetting, setSetting } from 'plugins/syncPlay/core/Settings';
import Events from 'utils/events';
import { queryClient } from 'utils/query/queryClient';

import { getSyncPlayManager, syncPlayStore } from './syncPlayStore';

/** Same key as the upstream groups query: the lists refresh together. */
const GROUPS_QUERY_KEY = [ 'SyncPlay', 'Groups' ];

const refreshGroups = () => queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY }).catch(() => undefined);

function apiClient() {
    const client = ServerConnections.currentApiClient();
    if (!client) throw new Error('SyncPlay: no server connection');
    return client;
}

/** The groups the user can join, with their people and what they are doing. */
export function listGroups(): Promise<GroupInfoDto[]> {
    return apiClient().getSyncPlayGroups().then(groups => groups ?? []);
}

export async function joinGroup(groupId: string) {
    await apiClient().joinSyncPlayGroup({ GroupId: groupId });
    void refreshGroups();
}

export async function createGroup(name: string) {
    await apiClient().createSyncPlayGroup({ GroupName: name });
    void refreshGroups();
}

export async function leaveGroup() {
    await apiClient().leaveSyncPlayGroup();
    void refreshGroups();
}

/** Stops the playback here only: the group plays on without waiting for this screen. */
export function stopForMe() {
    const manager = getSyncPlayManager();
    if (!manager) return;
    manager.haltGroupPlayback(manager.getApiClient());
    syncPlayStore.refresh();
}

/** Follows the group again, and starts what it plays. */
export function followAgain() {
    const manager = getSyncPlayManager();
    if (!manager) return;
    manager.resumeGroupPlayback(manager.getApiClient());
    syncPlayStore.refresh();
}

/** The switches of the synchronisation, as the playback core uses them. */
export interface SyncSettings {
    enableSyncCorrection: boolean
    useSpeedToSync: boolean
    useSkipToSync: boolean
    extraTimeOffset: number
}

const toBoolean = (value: unknown, fallback: boolean) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return fallback;
};

/** The settings in force: read from the playback core when SyncPlay runs, else from the saved values. */
export function getSyncSettings(): SyncSettings {
    const manager = getSyncPlayManager();
    const core = manager?.getPlaybackCore();
    const offset = manager?.getTimeSyncCore().extraTimeOffset ?? Number(getSetting('extraTimeOffset'));
    return {
        // The upstream defaults: correction off, both ways of catching up on
        enableSyncCorrection: core?.enableSyncCorrection ?? toBoolean(getSetting('enableSyncCorrection'), false),
        useSpeedToSync: core?.useSpeedToSync ?? toBoolean(getSetting('useSpeedToSync'), true),
        useSkipToSync: core?.useSkipToSync ?? toBoolean(getSetting('useSkipToSync'), true),
        extraTimeOffset: Number.isFinite(offset) ? offset : 0
    };
}

/** Saves a setting and tells the cores, which read their settings again. */
export function setSyncSetting(name: keyof SyncSettings | string, value: boolean | number) {
    setSetting(name, value);
    const manager = getSyncPlayManager();
    if (manager) Events.trigger(manager, 'settings-update');
}
