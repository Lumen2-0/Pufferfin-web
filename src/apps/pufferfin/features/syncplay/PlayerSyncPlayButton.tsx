import { SyncPlayUserAccessType } from '@jellyfin/sdk/lib/generated-client/models/sync-play-user-access-type';
import React, { type FC, type MouseEvent, useCallback, useSyncExternalStore } from 'react';

import { pluginManager } from 'components/pluginManager';
import { PluginType } from 'constants/pluginType';
import { useApi } from 'hooks/useApi';

import { PANEL_TOGGLE_ATTRIBUTE } from '../player/osd/panelHost';
import { playerText } from '../player/osd/strings';

import { syncPlayControl } from './syncPlayControl';
import { syncPlayStore } from './syncPlayStore';

import './syncPlayPanel.scss';

/**
 * The SyncPlay button of the player header: it opens the SyncPlay panel of
 * the player, the people of the group shown as a count while in one.
 */
const PlayerSyncPlayButton: FC = () => {
    const { user } = useApi();
    const isOpen = useSyncExternalStore(syncPlayControl.subscribe, syncPlayControl.isOpen);
    const { group } = useSyncExternalStore(syncPlayStore.subscribe, syncPlayStore.getSnapshot);

    const onClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        syncPlayControl.toggle(event.currentTarget);
    }, []);

    if (
        (user?.Policy && user.Policy.SyncPlayAccess === SyncPlayUserAccessType.None)
        || pluginManager.ofType(PluginType.SyncPlay).length === 0
    ) {
        return null;
    }

    const count = group?.Participants?.length ?? 0;
    const label = group ?
        `${playerText('SyncPlayTitle')} · ${group.GroupName ?? ''}` :
        playerText('SyncPlayTitle');

    return (
        <button
            type='button'
            className={group ? 'pf-osd-top__sync pf-osd-top__sync--active' : 'pf-osd-top__sync'}
            aria-label={label}
            title={label}
            aria-haspopup='dialog'
            aria-expanded={isOpen}
            onClick={onClick}
            {...{ [PANEL_TOGGLE_ATTRIBUTE]: '' }}
        >
            <svg aria-hidden='true' focusable='false' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.75' strokeLinecap='round' strokeLinejoin='round'>
                <circle cx='9' cy='8' r='3.25' />
                <path d='M3.5 19v-.5A4.5 4.5 0 0 1 8 14h2a4.5 4.5 0 0 1 4.5 4.5v.5' />
                <path d='M15.5 4.9a3.25 3.25 0 0 1 0 6.2' />
                <path d='M17.5 14.2A4.5 4.5 0 0 1 20.5 18.5v.5' />
            </svg>
            {count > 0 && <span className='pf-osd-top__sync-count' aria-hidden='true'>{count}</span>}
        </button>
    );
};

export default PlayerSyncPlayButton;
