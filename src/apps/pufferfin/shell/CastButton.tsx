import classNames from 'classnames';
import React, { type FC, useCallback, useEffect, useState } from 'react';

import RemotePlayActiveMenu, { ID as ACTIVE_ID } from 'apps/modern/components/AppToolbar/menus/RemotePlayActiveMenu';
import RemotePlayMenu, { ID } from 'apps/modern/components/AppToolbar/menus/RemotePlayMenu';
import { playbackManager } from 'components/playback/playbackmanager';
import Events from 'utils/events';

import { useTranslation } from '../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import { Cast, CastConnected } from '../components/icons';

/**
 * Cast entry of the upstream header, kept in the Pufferfin bar: picks the
 * device that plays, or controls the remote one once connected. Both menus
 * are the upstream ones.
 */
const CastButton: FC = () => {
    const t = useTranslation();
    const [ playerInfo, setPlayerInfo ] = useState(playbackManager.getPlayerInfo());
    const [ anchorEl, setAnchorEl ] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const update = () => setPlayerInfo(playbackManager.getPlayerInfo());
        Events.on(playbackManager, 'playerchange', update);
        return () => {
            Events.off(playbackManager, 'playerchange', update);
        };
    }, []);

    const onClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    }, []);

    const onMenuClose = useCallback(() => {
        setAnchorEl(null);
    }, []);

    const isRemote = !!playerInfo && !playerInfo.isLocalPlayer;
    // The device name comes from the device itself
    const deviceName = isRemote ? (playerInfo.deviceName || playerInfo.name) : undefined;

    return (
        <>
            <button
                type='button'
                className={classNames('pf-button', 'pf-button--quiet', 'pf-nav__link', {
                    'pf-button--icon': !isRemote,
                    'pf-button--selected': isRemote
                })}
                aria-label={isRemote ? t('ShellCastActive', deviceName ?? '') : t('ShellCast')}
                aria-controls={isRemote ? ACTIVE_ID : ID}
                aria-haspopup='true'
                aria-expanded={!!anchorEl}
                onClick={onClick}
                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
            >
                <span className='pf-button__icon' aria-hidden='true'>{isRemote ? <CastConnected /> : <Cast />}</span>
                {isRemote && <span className='pf-button__label' aria-hidden='true'>{deviceName}</span>}
            </button>

            <RemotePlayMenu
                open={!isRemote && !!anchorEl}
                anchorEl={anchorEl}
                onMenuClose={onMenuClose}
            />
            <RemotePlayActiveMenu
                open={isRemote && !!anchorEl}
                anchorEl={anchorEl}
                onMenuClose={onMenuClose}
                playerInfo={playerInfo}
            />
        </>
    );
};

export default CastButton;
