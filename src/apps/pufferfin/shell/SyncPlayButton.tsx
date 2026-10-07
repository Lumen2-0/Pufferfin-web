import { SyncPlayUserAccessType } from '@jellyfin/sdk/lib/generated-client/models/sync-play-user-access-type';
import Groups from '@mui/icons-material/Groups';
import classNames from 'classnames';
import React, { type FC, useCallback, useState } from 'react';

import SyncPlayMenu, { ID } from 'apps/modern/components/AppToolbar/menus/SyncPlayMenu';
import { QUERY_KEY } from 'apps/modern/features/syncPlay/hooks/api/useSyncPlayGroups';
import { useSyncPlay } from 'apps/modern/features/syncPlay/hooks/useSyncPlay';
import { pluginManager } from 'components/pluginManager';
import { PluginType } from 'constants/pluginType';
import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';

import { useTranslation } from '../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';

/**
 * SyncPlay entry of the upstream header, kept in the Pufferfin bar. The group
 * menu itself is the upstream one: joining, creating and leaving a group stay
 * upstream logic.
 */
const SyncPlayButton: FC = () => {
    const t = useTranslation();
    const { user } = useApi();
    const { isActive } = useSyncPlay();
    const [ anchorEl, setAnchorEl ] = useState<HTMLElement | null>(null);

    const onClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
        // The groups are refreshed each time the menu opens, as upstream does
        void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        setAnchorEl(event.currentTarget);
    }, []);

    const onMenuClose = useCallback(() => {
        setAnchorEl(null);
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
                title={label}
                aria-controls={ID}
                aria-haspopup='true'
                aria-expanded={!!anchorEl}
                onClick={onClick}
                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
            >
                <span className='pf-button__icon' aria-hidden='true'><Groups /></span>
                {/* An active group shows a dot as well as the firmer outline: never color alone */}
                {isActive && <span className='pf-nav__dot' aria-hidden='true' />}
            </button>

            <SyncPlayMenu
                open={!!anchorEl}
                anchorEl={anchorEl}
                onMenuClose={onMenuClose}
            />
        </>
    );
};

export default SyncPlayButton;
