import { type FC, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { getPlaybackSkinClasses } from './playerSkin';

import '../dialogs/dialogs.scss';
import './lyrics.scss';
import './nowPlayingBar.scss';
import './player.scss';
import './playerMenus.scss';
import './queue.scss';

/**
 * Serves every playback screen and every shared dialog in the Pufferfin style,
 * whatever the layout and whatever screen started the playback. Dialogs, the
 * video player and toasts live outside the page element, so the classes go on
 * the document element.
 */
const PlaybackSkin: FC = () => {
    const { pathname } = useLocation();
    const classNames = getPlaybackSkinClasses(pathname).join(' ');

    useEffect(() => {
        const classes = classNames.split(' ');
        document.documentElement.classList.add(...classes);
        return () => {
            document.documentElement.classList.remove(...classes);
        };
    }, [ classNames ]);

    return null;
};

export default PlaybackSkin;
