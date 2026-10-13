import Box from '@mui/material/Box/Box';
import Fade from '@mui/material/Fade/Fade';
import React, { useRef, type FC, useEffect, useState } from 'react';

import RemotePlayButton from 'apps/modern/components/AppToolbar/RemotePlayButton';
import SyncPlayButton from 'apps/modern/components/AppToolbar/SyncPlayButton';
// PUFFERFIN: the header of the player: Back, the title, Episodes, SyncPlay and cast
import EpisodesButton from 'apps/pufferfin/features/player/osd/EpisodesButton';
import { appRouter } from 'components/router/appRouter';
import ViewManagerPage from 'components/viewManager/ViewManagerPage';
import { EventType } from 'constants/eventType';
import globalize from 'lib/globalize';
import Events, { type Event } from 'utils/events';

const onBackClick = () => {
    appRouter.back()
        .catch(err => {
            console.error('[VideoPage] error calling appRouter.back', err);
        });
};

/**
 * Video player page component that renders mui controls for the top controls and the legacy view for everything else.
 */
const VideoPage: FC = () => {
    const documentRef = useRef<Document>(document);
    const [ isVisible, setIsVisible ] = useState(true);
    const [ videoTitle, setVideoTitle ] = useState<string>('');

    const onShowVideoOsd = (_e: Event, isShowing: boolean) => {
        setIsVisible(isShowing);
    };

    const onTitleChange = (_e: Event, title: string) => {
        setVideoTitle(title);
    };

    useEffect(() => {
        const doc = documentRef.current;

        if (doc) {
            Events.on(doc, EventType.SHOW_VIDEO_OSD, onShowVideoOsd);
            Events.on(doc, EventType.VIDEO_TITLE_CHANGE, onTitleChange);
        }

        return () => {
            if (doc) {
                Events.off(doc, EventType.SHOW_VIDEO_OSD, onShowVideoOsd);
                Events.off(doc, EventType.VIDEO_TITLE_CHANGE, onTitleChange);
            }
        };
    }, []);

    return (
        <>
            <Fade
                in={isVisible}
                easing='fade-out'
            >
                <Box
                    className='skinHeader skinHeader-withBackground skinHeader-blurred osdHeader'
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        color: 'white',
                        pointerEvents: 'unset !important'
                    }}
                >
                    {/* PUFFERFIN: Back and the title on the left, the actions on the right */}
                    <div className='videoOsd-appBar pf-osd-top'>
                        <div className='pf-osd-top__start'>
                            <button
                                type='button'
                                className='pf-osd-top__back'
                                aria-label={globalize.translate('ButtonBack')}
                                onClick={onBackClick}
                            >
                                <svg aria-hidden='true' focusable='false' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.75' strokeLinecap='round' strokeLinejoin='round'>
                                    <path d='M19 12H5' /><path d='M11 6l-6 6 6 6' />
                                </svg>
                            </button>
                            <div className='pf-osd-top__title'>{videoTitle}</div>
                        </div>
                        <div className='pf-osd-top__actions'>
                            <EpisodesButton />
                            <SyncPlayButton />
                            <RemotePlayButton />
                        </div>
                    </div>
                </Box>
            </Fade>

            <ViewManagerPage
                controller='playback/video/index'
                view='playback/video/index.html'
                type='video-osd'
                isFullscreen
                isNowPlayingBarEnabled={false}
                isThemeMediaSupported
            />
        </>
    );
};

export default VideoPage;
