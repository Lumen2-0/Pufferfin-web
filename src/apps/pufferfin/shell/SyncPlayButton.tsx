import { SyncPlayUserAccessType } from '@jellyfin/sdk/lib/generated-client/models/sync-play-user-access-type';
import classNames from 'classnames';
import React, { type FC, useCallback } from 'react';

import { QUERY_KEY } from 'apps/modern/features/syncPlay/hooks/api/useSyncPlayGroups';
import { useSyncPlay } from 'apps/modern/features/syncPlay/hooks/useSyncPlay';
import { pluginManager } from 'components/pluginManager';
import { PluginType } from 'constants/pluginType';
import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';

import { useTranslation } from '../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import { Groups } from '../components/icons';
import SyncPlayModal, { openSyncPlay, useIsSyncPlayOpen } from '../features/syncplay/SyncPlayModal';

/**
 * SyncPlay entry of the bar: it opens the Pufferfin SyncPlay window, where
 * groups are joined, created and left. The group logic stays upstream.
 */
const SyncPlayButton: FC = () => {
    const t = useTranslation();
    const { user } = useApi();
    const { isActive } = useSyncPlay();
    const isOpen = useIsSyncPlayOpen();

    const onClick = useCallback(() => {
        // The groups are read again each time the window opens
        void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        openSyncPlay();
    }, []);

    if (
        (user?.Policy && user.Policy.SyncPlayAccess === SyncPlayUserAccessType.None)
        || pluginManager.ofType(PluginType.SyncPlay).length === 0
    ) {
        return null;
    }

    const label = t(isActive ? 'ShellSyncPlayActive' : 'ShellSyncPlay');

    return (
        <>
            <button
                type='button'
                className={classNames('pf-button', 'pf-button--quiet', 'pf-button--icon', 'pf-nav__link', { 'pf-button--selected': isActive })}
                aria-label={label}
                aria-haspopup='dialog'
                aria-expanded={isOpen}
                onClick={onClick}
                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
            >
                <span className='pf-button__icon' aria-hidden='true'><Groups /></span>
                {/* An active group shows a dot as well as the firmer outline: never color alone */}
                {isActive && <span className='pf-nav__dot' aria-hidden='true' />}
            </button>

            <SyncPlayModal />
        </>
    );
};

export default SyncPlayButton;
