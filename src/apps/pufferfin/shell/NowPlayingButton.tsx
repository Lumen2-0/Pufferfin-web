import React, { type FC, useCallback, useEffect, useState } from 'react';

import { playbackManager } from 'components/playback/playbackmanager';
import { appRouter } from 'components/router/appRouter';
import Events from 'utils/events';

import { useTranslation } from '../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import { MusicNote } from '../components/icons';

interface PlaybackStopInfo {
    nextMediaType?: string
}

/**
 * Audio player entry of the upstream header, kept in the Pufferfin bar: while
 * music plays it opens the play queue. In the TV layout the upstream now
 * playing bar never shows, so this is the only way back to the player.
 */
const NowPlayingButton: FC = () => {
    const t = useTranslation();
    const [ isPlayingAudio, setIsPlayingAudio ] = useState(() => !!playbackManager.isPlayingAudio());

    useEffect(() => {
        const onStart = () => setIsPlayingAudio(!!playbackManager.isPlayingAudio());
        // Same rule as upstream: the entry stays while the next item is audio too
        const onStop = (_e: unknown, stopInfo?: PlaybackStopInfo) => {
            if (stopInfo?.nextMediaType !== 'Audio') setIsPlayingAudio(false);
        };

        Events.on(playbackManager, 'playbackstart', onStart);
        Events.on(playbackManager, 'playbackstop', onStop);
        return () => {
            Events.off(playbackManager, 'playbackstart', onStart);
            Events.off(playbackManager, 'playbackstop', onStop);
        };
    }, []);

    const onClick = useCallback(() => {
        void appRouter.showNowPlaying();
    }, []);

    if (!isPlayingAudio) return null;

    return (
        <button
            type='button'
            className='pf-button pf-button--quiet pf-button--icon pf-nav__link'
            aria-label={t('ShellNowPlaying')}
            title={t('ShellNowPlaying')}
            onClick={onClick}
            {...{ [FOCUSABLE_ATTRIBUTE]: true }}
        >
            <span className='pf-button__icon' aria-hidden='true'><MusicNote /></span>
        </button>
    );
};

export default NowPlayingButton;
