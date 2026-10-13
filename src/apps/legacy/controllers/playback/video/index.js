import escapeHtml from 'escape-html';

import { PlayerEvent } from 'apps/legacy/features/playback/constants/playerEvent';
import { AppFeature } from 'constants/appFeature';
import { PluginType } from 'constants/pluginType';
import { TICKS_PER_MINUTE, TICKS_PER_SECOND } from 'constants/time';
import { EventType } from 'constants/eventType';

import { playbackManager } from 'components/playback/playbackmanager';
import browser from 'scripts/browser';
import dom from 'utils/dom';
import inputManager from 'scripts/inputManager';
import mouseManager from 'scripts/mouseManager';
import datetime from 'scripts/datetime';
import itemHelper from 'components/itemHelper';
import mediaInfo from 'components/mediainfo/mediainfo';
import focusManager from 'components/focusManager';
import Events from 'utils/events';
import globalize from 'lib/globalize';
import { appHost } from 'components/apphost';
import layoutManager from 'components/layoutManager';
import * as userSettings from 'scripts/settings/userSettings';
import keyboardnavigation from 'scripts/keyboardNavigation';
import 'styles/scrollstyles.scss';
import 'elements/emby-slider/emby-slider';
import 'elements/emby-button/paper-icon-button-light';
import 'elements/emby-ratingbutton/emby-ratingbutton';
import 'styles/videoosd.scss';
import shell from 'scripts/shell';
import SubtitleSync from 'components/subtitlesync/subtitlesync';
import { appRouter } from 'components/router/appRouter';
import { ServerConnections } from 'lib/jellyfin-apiclient';
import LibraryMenu from 'scripts/libraryMenu';
import { setBackdropTransparency, TRANSPARENCY_LEVEL } from 'components/backdrop/backdrop';
import { pluginManager } from 'components/pluginManager';
import { createInlineVolume, enableButtonHints, getVolumeIcon } from 'apps/pufferfin/features/player/volumePanel';
// PUFFERFIN: the panels of the player (audio and subtitles, settings, episodes) and the words they use
import { MediaSegmentType } from '@jellyfin/sdk/lib/generated-client/models/media-segment-type';
import { MediaSegmentAction } from 'apps/legacy/features/playback/constants/mediaSegmentAction';
import { getId as getSegmentSettingId, getMediaSegmentAction } from 'apps/legacy/features/playback/utils/mediaSegmentSettings';
import { episodesControl } from 'apps/pufferfin/features/player/osd/episodesControl';
import { renderEpisodesPanel } from 'apps/pufferfin/features/player/osd/episodesPanel';
import { ICONS } from 'apps/pufferfin/features/player/osd/icons';
import { getChapterAt, getChapterMarkers } from 'apps/pufferfin/features/player/osd/model';
import { createPanelHost, PANEL_OPEN_CLASS, PANEL_TOGGLE_ATTRIBUTE } from 'apps/pufferfin/features/player/osd/panelHost';
import { renderSettingsPanel } from 'apps/pufferfin/features/player/osd/settingsPanel';
import { loadPlayerText, playerText } from 'apps/pufferfin/features/player/osd/strings';
import { renderTracksPanel } from 'apps/pufferfin/features/player/osd/tracksPanel';
import { statusForAction, statusForGroupState } from 'apps/pufferfin/features/syncplay/model';
import { createSyncPlayStatus } from 'apps/pufferfin/features/syncplay/playerStatus';
import { syncPlayControl } from 'apps/pufferfin/features/syncplay/syncPlayControl';
import { createSyncPlayPanel } from 'apps/pufferfin/features/syncplay/syncPlayPanel';
import { syncPlayStore } from 'apps/pufferfin/features/syncplay/syncPlayStore';
import qualityoptions from 'components/qualityOptions';

function getOpenedDialog() {
    return document.querySelector('.dialogContainer .dialog.opened');
}

export default function (view) {
    function getDisplayItem(item) {
        if (item.Type === 'TvChannel') {
            const apiClient = ServerConnections.getApiClient(item.ServerId);
            return apiClient.getItem(apiClient.getCurrentUserId(), item.Id).then(function (refreshedItem) {
                return {
                    originalItem: refreshedItem,
                    displayItem: refreshedItem.CurrentProgram
                };
            });
        }

        return Promise.resolve({
            originalItem: item
        });
    }

    function updateRecordingButton(item) {
        if (!item || item.Type !== 'Program') {
            if (recordingButtonManager) {
                recordingButtonManager.destroy();
                recordingButtonManager = null;
            }

            view.querySelector('.btnRecord').classList.add('hide');
            return;
        }

        ServerConnections.getApiClient(item.ServerId).getCurrentUser().then(function (user) {
            if (user.Policy.EnableLiveTvManagement) {
                import('components/recordingcreator/recordingbutton').then(({ default: RecordingButton }) => {
                    if (recordingButtonManager) {
                        recordingButtonManager.refreshItem(item);
                        return;
                    }

                    recordingButtonManager = new RecordingButton({
                        item: item,
                        button: view.querySelector('.btnRecord')
                    });
                    view.querySelector('.btnRecord').classList.remove('hide');
                });
            }
        });
    }

    function updateDisplayItem(itemInfo) {
        const item = itemInfo.originalItem;
        currentItem = item;
        const displayItem = itemInfo.displayItem || item;
        updateRecordingButton(displayItem);
        let parentName = displayItem.SeriesName || displayItem.Album;

        if (displayItem.EpisodeTitle || displayItem.IsSeries) {
            parentName = displayItem.Name;
        }

        setTitle(displayItem, parentName);

        const secondaryMediaInfo = view.querySelector('.osdSecondaryMediaInfo');
        const secondaryMediaInfoHtml = mediaInfo.getSecondaryMediaInfoHtml(displayItem, {
            startDate: false,
            programTime: false
        });
        secondaryMediaInfo.innerHTML = secondaryMediaInfoHtml;

        if (secondaryMediaInfoHtml) {
            secondaryMediaInfo.classList.remove('hide');
        } else {
            secondaryMediaInfo.classList.add('hide');
        }

        if (enableProgressByTimeOfDay) {
            setDisplayTime(startTimeText, displayItem.StartDate);
            setDisplayTime(endTimeText, displayItem.EndDate);
            startTimeText.classList.remove('hide');
            endTimeText.classList.remove('hide');
            programStartDateMs = displayItem.StartDate ? datetime.parseISO8601Date(displayItem.StartDate).getTime() : 0;
            programEndDateMs = displayItem.EndDate ? datetime.parseISO8601Date(displayItem.EndDate).getTime() : 0;
        } else {
            startTimeText.classList.add('hide');
            endTimeText.classList.add('hide');
            startTimeText.innerHTML = '';
            endTimeText.innerHTML = '';
            programStartDateMs = 0;
            programEndDateMs = 0;
        }

        // PUFFERFIN: no rating button; an episode can open the episodes of its series
        updateEpisodesAvailability(item);

        // Update trickplay data
        trickplayResolution = null;

        const mediaSourceId = currentPlayer.streamInfo.mediaSource.Id;
        const trickplayResolutions = item.Trickplay?.[mediaSourceId];
        if (trickplayResolutions) {
            // Prefer highest resolution <= 20% of total screen resolution width
            let bestWidth;
            const maxWidth = window.screen.width * window.devicePixelRatio * 0.2;
            for (const [, info] of Object.entries(trickplayResolutions)) {
                if (!bestWidth
                        || (info.Width < bestWidth && bestWidth > maxWidth) // Objects not guaranteed to be sorted in any order, first width might be > maxWidth.
                        || (info.Width > bestWidth && info.Width <= maxWidth)) {
                    bestWidth = info.Width;
                }
            }

            if (bestWidth) trickplayResolution = trickplayResolutions[bestWidth];
        }
    }

    function getDisplayTimeWithoutAmPm(date, showSeconds) {
        if (showSeconds) {
            return datetime.toLocaleTimeString(date, {
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit'
            }).toLowerCase().replace('am', '').replace('pm', '').trim();
        }

        return datetime.getDisplayTime(date).toLowerCase().replace('am', '').replace('pm', '').trim();
    }

    function setDisplayTime(elem, date) {
        let html;

        if (date) {
            date = datetime.parseISO8601Date(date);
            html = getDisplayTimeWithoutAmPm(date);
        }

        elem.innerHTML = html || '';
    }

    function shouldEnableProgressByTimeOfDay(item) {
        return !(item.Type !== 'TvChannel' || !item.CurrentProgram);
    }

    function updateNowPlayingInfo(player, state) {
        const item = state.NowPlayingItem;

        currentItem = item;
        if (!item) {
            updateRecordingButton(null);
            LibraryMenu.setTitle('');
            Events.trigger(document, EventType.VIDEO_TITLE_CHANGE, [ '' ]);
            nowPlayingVolumeSlider.disabled = true;
            nowPlayingPositionSlider.disabled = true;
            btnFastForward.disabled = true;
            btnRewind.disabled = true;
            view.querySelector('.btnSubtitles').classList.add('hide');
            view.querySelector('.osdTitle').innerHTML = '';
            updateEpisodesAvailability(null);
            return;
        }

        enableProgressByTimeOfDay = shouldEnableProgressByTimeOfDay(item);
        getDisplayItem(item).then(updateDisplayItem);
        nowPlayingVolumeSlider.disabled = false;
        nowPlayingPositionSlider.disabled = false;
        btnFastForward.disabled = false;
        btnRewind.disabled = false;

        if (playbackManager.subtitleTracks(player).length) {
            toggleSubtitleSync();
        } else {
            toggleSubtitleSync('forceToHide');
        }

        // PUFFERFIN: one button for the audio and the subtitles, shown when there is a choice
        const hasTrackChoice = playbackManager.subtitleTracks(player).length > 0 || playbackManager.audioTracks(player).length > 1;
        view.querySelector('.btnSubtitles').classList.toggle('hide', !hasTrackChoice);
        if (!hasTrackChoice && panels.isOpen('tracks')) panels.close(false);

        if (currentItem.Chapters?.length > 1) {
            view.querySelector('.btnPreviousChapter').classList.remove('hide');
            view.querySelector('.btnNextChapter').classList.remove('hide');
        } else {
            view.querySelector('.btnPreviousChapter').classList.add('hide');
            view.querySelector('.btnNextChapter').classList.add('hide');
        }
    }

    function setTitle(item, parentName) {
        let itemName = itemHelper.getDisplayName(item, {
            includeParentInfo: item.Type !== 'Program',
            includeIndexNumber: item.Type !== 'Program'
        });

        if (itemName && parentName) {
            itemName = `${parentName} - ${itemName}`;
        }

        if (!itemName) {
            itemName = parentName || '';
        }

        // Display the item with its premiere date if it has one
        let title = itemName;
        if (item.Type == 'Movie' && item.ProductionYear) {
            title += ` (${datetime.toLocaleString(item.ProductionYear, { useGrouping: false })})`;
        } else if (item.PremiereDate) {
            try {
                const year = datetime.toLocaleString(datetime.parseISO8601Date(item.PremiereDate).getFullYear(), { useGrouping: false });
                title += ` (${year})`;
            } catch (e) {
                console.error(e);
            }
        }

        LibraryMenu.setTitle(title);
        Events.trigger(document, EventType.VIDEO_TITLE_CHANGE, [ title ]);

        document.title = title;
    }

    let mouseIsDown = false;

    function showOsd(focusElement) {
        Events.trigger(document, EventType.SHOW_VIDEO_OSD, [ true ]);
        slideDownToShow(headerElement);
        showMainOsdControls(focusElement);
        resetIdle();
    }

    function hideOsd() {
        // PUFFERFIN: an open panel holds the controls
        if (panels.isOpen()) return;
        Events.trigger(document, EventType.SHOW_VIDEO_OSD, [ false ]);
        slideUpToHide(headerElement);
        hideMainOsdControls();
        mouseManager.hideCursor();
    }

    function toggleOsd() {
        if (currentVisibleMenu === 'osd') {
            hideOsd();
        } else if (!currentVisibleMenu) {
            showOsd();
        }
    }

    function startOsdHideTimer() {
        stopOsdHideTimer();
        osdHideTimeout = setTimeout(hideOsd, 3e3);
    }

    function stopOsdHideTimer() {
        if (osdHideTimeout) {
            clearTimeout(osdHideTimeout);
            osdHideTimeout = null;
        }
    }

    function slideDownToShow(elem) {
        clearHideAnimationEventListeners(elem);
        elem.classList.remove('hide');
        elem.classList.remove('osdHeader-hidden');
    }

    function slideUpToHide(elem) {
        clearHideAnimationEventListeners(elem);
        elem.classList.add('osdHeader-hidden');
        elem.addEventListener(transitionEndEventName, onHideAnimationComplete);
    }

    function clearHideAnimationEventListeners(elem) {
        elem.removeEventListener(transitionEndEventName, onHideAnimationComplete);
    }

    function onHideAnimationComplete(e) {
        const elem = e.target;
        if (elem !== osdBottomElement && elem !== headerElement) return;
        elem.classList.add('hide');
        elem.removeEventListener(transitionEndEventName, onHideAnimationComplete);
    }

    const _focus = function (focusElement) {
        // If no focus element is provided, try to keep current focus if it's valid,
        // otherwise default to pause button
        const currentFocus = focusElement || document.activeElement;
        if (!currentFocus || !focusManager.isCurrentlyFocusable(currentFocus)) {
            focusElement = osdBottomElement.querySelector('.btnPause');
        }

        if (focusElement) focusManager.focus(focusElement);
    };

    function showMainOsdControls(focusElement) {
        if (!currentVisibleMenu) {
            const elem = osdBottomElement;
            currentVisibleMenu = 'osd';
            clearHideAnimationEventListeners(elem);
            elem.classList.remove('hide');
            elem.classList.remove('videoOsdBottom-hidden');

            if (!layoutManager.mobile) {
                _focus(focusElement);
            }
            toggleSubtitleSync();
        } else if (currentVisibleMenu === 'osd' && !layoutManager.mobile) {
            _focus(focusElement);
        }
    }

    function hideMainOsdControls() {
        if (currentVisibleMenu === 'osd') {
            const elem = osdBottomElement;
            clearHideAnimationEventListeners(elem);
            elem.classList.add('videoOsdBottom-hidden');

            elem.addEventListener(transitionEndEventName, onHideAnimationComplete);
            currentVisibleMenu = null;
            toggleSubtitleSync('hide');

            // Firefox does not blur by itself
            if (osdBottomElement.contains(document.activeElement)
                || headerElement.contains(document.activeElement)) {
                document.activeElement.blur();
            }
        }
    }

    // TODO: Move all idle-related code to `inputManager` or `idleManager` or `idleHelper` (per dialog thing) and listen event from there.

    function resetIdle() {
        // Restart hide timer if OSD is currently visible and there is no opened dialog
        if (currentVisibleMenu && !mouseIsDown && !getOpenedDialog() && !panels.isOpen()) {
            startOsdHideTimer();
        } else {
            stopOsdHideTimer();
        }
    }

    function onPointerMove(e) {
        if ((e.pointerType || (layoutManager.mobile ? 'touch' : 'mouse')) === 'mouse') {
            const eventX = e.screenX || e.clientX || 0;
            const eventY = e.screenY || e.clientY || 0;
            const obj = lastPointerMoveData;

            if (!obj) {
                lastPointerMoveData = {
                    x: eventX,
                    y: eventY
                };
                return;
            }

            if (Math.abs(eventX - obj.x) < 10 && Math.abs(eventY - obj.y) < 10) {
                return;
            }

            obj.x = eventX;
            obj.y = eventY;
            showOsd();
        }
    }

    function onInputCommand(e) {
        const player = currentPlayer;

        switch (e.detail.command) {
            case 'left':
                if (currentVisibleMenu === 'osd') {
                    showOsd();
                } else if (!currentVisibleMenu) {
                    e.preventDefault();
                    playbackManager.rewind(player);
                }

                break;

            case 'right':
                if (currentVisibleMenu === 'osd') {
                    showOsd();
                } else if (!currentVisibleMenu) {
                    e.preventDefault();
                    playbackManager.fastForward(player);
                }

                break;

            case 'pageup':
                playbackManager.nextChapter(player);
                break;

            case 'pagedown':
                playbackManager.previousChapter(player);
                break;

            case 'up':
            case 'down':
            case 'select':
            case 'menu':
            case 'info':
            case 'play':
            case 'playpause':
            case 'pause':
            case 'fastforward':
            case 'rewind':
            case 'next':
            case 'previous':
                showOsd();
                break;

            case 'record':
                onRecordingCommand();
                showOsd();
                break;

            case 'togglestats':
                toggleStats();
                break;

            case 'back':
                // PUFFERFIN: Back closes an open panel first
                if (panels.isOpen()) {
                    panels.close();
                    e.preventDefault();
                    break;
                }
                // Ignore command when some dialog is opened
                if (currentVisibleMenu === 'osd' && !getOpenedDialog()) {
                    hideOsd();
                    e.preventDefault();
                }
                break;
        }
    }

    function onRecordingCommand() {
        const btnRecord = view.querySelector('.btnRecord');

        if (!btnRecord.classList.contains('hide')) {
            btnRecord.click();
        }
    }

    function onFullscreenChanged() {
        if (currentPlayer.forcedFullscreen && !playbackManager.isFullscreen(currentPlayer)) {
            appRouter.back();
            return;
        }

        updateFullscreenIcon();
    }

    function updateFullscreenIcon() {
        const button = view.querySelector('.btnFullscreen');
        const icon = button.querySelector('.material-icons');

        icon.classList.remove('fullscreen_exit', 'fullscreen');

        if (playbackManager.isFullscreen(currentPlayer)) {
            button.setAttribute('title', globalize.translate('ExitFullscreen') + ' (F)');
            icon.classList.add('fullscreen_exit');
        } else {
            button.setAttribute('title', globalize.translate('Fullscreen') + ' (F)');
            icon.classList.add('fullscreen');
        }
    }

    function onPlayerChange() {
        bindToPlayer(playbackManager.getCurrentPlayer());
    }

    function onStateChanged(event, state) {
        const player = this;

        if (state.NowPlayingItem) {
            isEnabled = true;
            updatePlayerStateInternal(event, player, state);
            updatePlaylist();
            enableStopOnBack(true);
            updatePlaybackRate(player);
        }
    }

    function onPlayPauseStateChanged() {
        if (isEnabled) {
            updatePlayPauseState(this.paused());
        }
    }

    function onVolumeChanged() {
        if (isEnabled) {
            const player = this;
            updatePlayerVolumeState(player, player.isMuted(), player.getVolume());
        }
    }

    function onPlaybackStart(e, state) {
        console.debug('nowplaying event: ' + e.type);
        const player = this;
        onStateChanged.call(player, e, state);
        resetUpNextDialog();
        // PUFFERFIN: another video: its tracks and its settings, not those of the last one
        panels.close(false);
    }

    function resetUpNextDialog() {
        comingUpNextDisplayed = false;
        const dlg = currentUpNextDialog;

        if (dlg) {
            dlg.destroy();
            currentUpNextDialog = null;
        }
    }

    function onPlaybackStopped(e, state) {
        currentRuntimeTicks = null;
        resetUpNextDialog();
        console.debug('nowplaying event: ' + e.type);

        if (state.NextMediaType !== 'Video') {
            view.removeEventListener('viewbeforehide', onViewHideStopPlayback);
            appRouter.back();
        }
    }

    function onMediaStreamsChanged() {
        const player = this;
        const state = playbackManager.getPlayerState(player);
        onStateChanged.call(player, {
            type: 'init'
        }, state);
        // PUFFERFIN: the open audio and subtitles panel checks the new choice
        if (panels.isOpen('tracks')) panels.refresh();
    }

    function onBeginFetch() {
        view.querySelector('.osdMediaStatus').classList.remove('hide');
    }

    function onEndFetch() {
        view.querySelector('.osdMediaStatus').classList.add('hide');
    }

    function bindToPlayer(player) {
        if (player !== currentPlayer) {
            releaseCurrentPlayer();
            currentPlayer = player;
            if (!player) return;
        }
        const state = playbackManager.getPlayerState(player);
        onStateChanged.call(player, {
            type: 'init'
        }, state);
        Events.on(player, 'playbackstart', onPlaybackStart);
        Events.on(player, 'playbackstop', onPlaybackStopped);
        Events.on(player, PlayerEvent.PromptSkip, onPromptSkip);
        Events.on(player, 'volumechange', onVolumeChanged);
        Events.on(player, 'pause', onPlayPauseStateChanged);
        Events.on(player, 'unpause', onPlayPauseStateChanged);
        Events.on(player, 'timeupdate', onTimeUpdate);
        Events.on(player, 'fullscreenchange', onFullscreenChanged);
        Events.on(player, 'mediastreamschange', onMediaStreamsChanged);
        Events.on(player, 'beginFetch', onBeginFetch);
        Events.on(player, 'endFetch', onEndFetch);
        resetUpNextDialog();

        if (player.isFetching) {
            onBeginFetch();
        }
    }

    function releaseCurrentPlayer() {
        destroyStats();
        destroySubtitleSync();
        resetUpNextDialog();
        const player = currentPlayer;

        if (player) {
            Events.off(player, 'playbackstart', onPlaybackStart);
            Events.off(player, 'playbackstop', onPlaybackStopped);
            Events.off(player, PlayerEvent.PromptSkip, onPromptSkip);
            Events.off(player, 'volumechange', onVolumeChanged);
            Events.off(player, 'pause', onPlayPauseStateChanged);
            Events.off(player, 'unpause', onPlayPauseStateChanged);
            Events.off(player, 'timeupdate', onTimeUpdate);
            Events.off(player, 'fullscreenchange', onFullscreenChanged);
            Events.off(player, 'mediastreamschange', onMediaStreamsChanged);
            Events.off(player, 'beginFetch', onBeginFetch);
            Events.off(player, 'endFetch', onEndFetch);
            currentPlayer = null;
        }
    }

    function onTimeUpdate() {
        // Test for 'currentItem' is required for Firefox since its player spams 'timeupdate' events even being at breakpoint
        if (isEnabled && currentItem) {
            const now = new Date().getTime();

            if (now - lastUpdateTime >= 700) {
                lastUpdateTime = now;
                const player = this;
                currentRuntimeTicks = playbackManager.duration(player);
                const currentTime = playbackManager.currentTime(player) * 10000;
                updateTimeDisplay(currentTime, currentRuntimeTicks, playbackManager.playbackStartTime(player), playbackManager.getPlaybackRate(player), playbackManager.getBufferedRanges(player));
                const item = currentItem;
                refreshProgramInfoIfNeeded(player, item);
                showComingUpNextIfNeeded(player, item, currentTime, currentRuntimeTicks);
            }
        }
    }

    function onPromptSkip(e, mediaSegment) {
        const player = this;
        // PUFFERFIN: credits found by Intro Skipper often stop a second or two before the end
        if (mediaSegment && player && mediaSegment.EndTicks != null
            && mediaSegment.EndTicks >= playbackManager.duration(player) - CREDITS_END_TOLERANCE_TICKS
            && playbackManager.getNextItem()
            && userSettings.enableNextVideoInfoOverlay()
        ) {
            showComingUpNext(player);
        }
    }

    const CREDITS_END_TOLERANCE_TICKS = 3 * TICKS_PER_SECOND;

    function showComingUpNextIfNeeded(player, currentItem, currentTimeTicks, runtimeTicks) {
        if (runtimeTicks && currentTimeTicks && !comingUpNextDisplayed && !currentVisibleMenu && currentItem.Type === 'Episode' && userSettings.enableNextVideoInfoOverlay()) {
            let showAtSecondsLeft = 30;
            if (runtimeTicks >= 50 * TICKS_PER_MINUTE) {
                showAtSecondsLeft = 40;
            } else if (runtimeTicks >= 40 * TICKS_PER_MINUTE) {
                showAtSecondsLeft = 35;
            }
            const showAtTicks = runtimeTicks - showAtSecondsLeft * TICKS_PER_SECOND;
            const timeRemainingTicks = runtimeTicks - currentTimeTicks;

            if (currentTimeTicks >= showAtTicks && runtimeTicks >= (10 * TICKS_PER_MINUTE) && timeRemainingTicks >= (20 * TICKS_PER_SECOND)) {
                showComingUpNext(player);
            }
        }
    }

    function onUpNextHidden() {
        if (currentVisibleMenu === 'upnext') {
            currentVisibleMenu = null;
        }
    }

    function showComingUpNext(player) {
        import('components/upnextdialog/upnextdialog').then(({ default: UpNextDialog }) => {
            if (!(currentVisibleMenu || currentUpNextDialog)) {
                currentVisibleMenu = 'upnext';
                comingUpNextDisplayed = true;
                playbackManager.nextItem(player).then(function (nextItem) {
                    currentUpNextDialog = new UpNextDialog({
                        parent: view.querySelector('.upNextContainer'),
                        player: player,
                        nextItem: nextItem
                    });
                    Events.on(currentUpNextDialog, 'hide', onUpNextHidden);
                }, onUpNextHidden);
            }
        });
    }

    function refreshProgramInfoIfNeeded(player, item) {
        if (item.Type === 'TvChannel') {
            const program = item.CurrentProgram;

            if (program?.EndDate) {
                try {
                    const endDate = datetime.parseISO8601Date(program.EndDate);

                    if (new Date().getTime() >= endDate.getTime()) {
                        console.debug('program info needs to be refreshed');
                        const state = playbackManager.getPlayerState(player);
                        onStateChanged.call(player, {
                            type: 'init'
                        }, state);
                    }
                } catch (e) {
                    console.error('error parsing date: ' + program.EndDate, e);
                }
            }
        }
    }

    function updatePlayPauseState(isPaused) {
        const btnPlayPause = view.querySelector('.btnPause');
        const btnPlayPauseIcon = btnPlayPause.querySelector('.material-icons');

        btnPlayPauseIcon.classList.remove('play_arrow', 'pause');

        let icon;
        let title;

        if (isPaused) {
            icon = 'play_arrow';
            title = globalize.translate('Play');
        } else {
            icon = 'pause';
            title = globalize.translate('ButtonPause');
        }

        btnPlayPauseIcon.classList.add(icon);
        dom.setElementTitle(btnPlayPause, title + ' (K)', title);
    }

    function updatePlayerStateInternal(event, player, state) {
        const playState = state.PlayState || {};
        updatePlayPauseState(playState.IsPaused);
        const supportedCommands = playbackManager.getSupportedCommands(player);
        currentPlayerSupportedCommands = supportedCommands;
        updatePlayerVolumeState(player, playState.IsMuted, playState.VolumeLevel);

        if (nowPlayingPositionSlider && !nowPlayingPositionSlider.dragging) {
            nowPlayingPositionSlider.disabled = !playState.CanSeek;
        }

        btnFastForward.disabled = !playState.CanSeek;
        btnRewind.disabled = !playState.CanSeek;
        const nowPlayingItem = state.NowPlayingItem || {};
        playbackStartTimeTicks = playState.PlaybackStartTimeTicks;
        updateTimeDisplay(playState.PositionTicks, nowPlayingItem.RunTimeTicks, playState.PlaybackStartTimeTicks, playState.PlaybackRate, playState.BufferedRanges || []);
        updateNowPlayingInfo(player, state);

        const isProgressClear = state.MediaSource && state.MediaSource.RunTimeTicks == null;
        nowPlayingPositionSlider.setIsClear(isProgressClear);

        if (nowPlayingItem.RunTimeTicks) {
            nowPlayingPositionSlider.setKeyboardSteps(userSettings.skipBackLength() * 1000000 / nowPlayingItem.RunTimeTicks,
                userSettings.skipForwardLength() * 1000000 / nowPlayingItem.RunTimeTicks);
        }

        if (supportedCommands.indexOf('ToggleFullscreen') === -1 || player.isLocalPlayer && layoutManager.tv && playbackManager.isFullscreen(player)) {
            view.querySelector('.btnFullscreen').classList.add('hide');
        } else {
            view.querySelector('.btnFullscreen').classList.remove('hide');
        }

        if (supportedCommands.indexOf('PictureInPicture') === -1) {
            view.querySelector('.btnPip').classList.add('hide');
        } else {
            view.querySelector('.btnPip').classList.remove('hide');
        }

        if (supportedCommands.indexOf('AirPlay') === -1) {
            view.querySelector('.btnAirPlay').classList.add('hide');
        } else {
            view.querySelector('.btnAirPlay').classList.remove('hide');
        }

        onFullscreenChanged();
    }

    function getDisplayPercentByTimeOfDay(programStartDateMs, programRuntimeMs, currentTimeMs) {
        return (currentTimeMs - programStartDateMs) / programRuntimeMs * 100;
    }

    function updateTimeDisplay(positionTicks, runtimeTicks, playbackStartTimeTicks, playbackRate, bufferedRanges) {
        if (enableProgressByTimeOfDay) {
            if (nowPlayingPositionSlider && !nowPlayingPositionSlider.dragging) {
                if (programStartDateMs && programEndDateMs) {
                    const currentTimeMs = (playbackStartTimeTicks + (positionTicks || 0)) / 1e4;
                    const programRuntimeMs = programEndDateMs - programStartDateMs;

                    nowPlayingPositionSlider.value = getDisplayPercentByTimeOfDay(programStartDateMs, programRuntimeMs, currentTimeMs);

                    if (bufferedRanges.length) {
                        const rangeStart = getDisplayPercentByTimeOfDay(programStartDateMs, programRuntimeMs, (playbackStartTimeTicks + (bufferedRanges[0].start || 0)) / 1e4);
                        const rangeEnd = getDisplayPercentByTimeOfDay(programStartDateMs, programRuntimeMs, (playbackStartTimeTicks + (bufferedRanges[0].end || 0)) / 1e4);
                        nowPlayingPositionSlider.setBufferedRanges([{
                            start: rangeStart,
                            end: rangeEnd
                        }]);
                    } else {
                        nowPlayingPositionSlider.setBufferedRanges([]);
                    }
                } else {
                    nowPlayingPositionSlider.value = 0;
                    nowPlayingPositionSlider.setBufferedRanges([]);
                }
            }

            nowPlayingPositionText.innerHTML = '';
            nowPlayingDurationText.innerHTML = '';
        } else {
            if (nowPlayingPositionSlider && !nowPlayingPositionSlider.dragging) {
                if (runtimeTicks) {
                    let pct = positionTicks / runtimeTicks;
                    pct *= 100;
                    nowPlayingPositionSlider.value = pct;
                } else {
                    nowPlayingPositionSlider.value = 0;
                }

                if (runtimeTicks && positionTicks != null && currentRuntimeTicks && !enableProgressByTimeOfDay && currentItem.RunTimeTicks && currentItem.Type !== 'Recording' && playbackRate !== null) {
                    endsAtText.textContent = mediaInfo.getEndsAtFromPosition(runtimeTicks, positionTicks, playbackRate, true);
                } else {
                    endsAtText.innerHTML = '';
                }
            }

            if (nowPlayingPositionSlider) {
                nowPlayingPositionSlider.setBufferedRanges(bufferedRanges, runtimeTicks, positionTicks);
            }

            if (positionTicks >= 0) {
                updateTimeText(nowPlayingPositionText, positionTicks);
                nowPlayingPositionText.classList.remove('hide');
            } else {
                nowPlayingPositionText.classList.add('hide');
            }

            if (userSettings.enableVideoRemainingTime()) {
                const leftTicks = runtimeTicks - positionTicks;
                if (leftTicks >= 0) {
                    updateTimeText(nowPlayingDurationText, leftTicks);
                    nowPlayingDurationText.innerHTML = '-' + nowPlayingDurationText.innerHTML;
                    nowPlayingDurationText.classList.remove('hide');
                } else {
                    nowPlayingPositionText.classList.add('hide');
                }
            } else {
                updateTimeText(nowPlayingDurationText, runtimeTicks);
                nowPlayingDurationText.classList.remove('hide');
            }
        }
    }

    function updatePlayerVolumeState(player, isMuted, volumeLevel) {
        const supportedCommands = currentPlayerSupportedCommands;
        let showMuteButton = true;
        let showVolumeSlider = true;

        if (supportedCommands.indexOf('Mute') === -1) {
            showMuteButton = false;
        }

        if (supportedCommands.indexOf('SetVolume') === -1) {
            showVolumeSlider = false;
        }

        if (player.isLocalPlayer && appHost.supports(AppFeature.PhysicalVolumeControl)) {
            showMuteButton = false;
            showVolumeSlider = false;
        }

        const buttonMute = view.querySelector('.buttonMute');
        const buttonMuteIcon = buttonMute.querySelector('.material-icons');

        buttonMuteIcon.classList.remove('volume_off', 'volume_up');

        // PUFFERFIN: the button mutes, its icon tells the level; the short bar beside it sets the volume
        buttonMuteIcon.classList.remove('volume_down');
        buttonMute.setAttribute('title', globalize.translate(isMuted ? 'Unmute' : 'Mute') + ' (M)');
        buttonMuteIcon.classList.add(getVolumeIcon(isMuted, volumeLevel));
        inlineVolume.update(isMuted, volumeLevel);
        inlineVolume.setAvailable(showVolumeSlider);

        if (showMuteButton) {
            buttonMute.classList.remove('hide');
        } else {
            buttonMute.classList.add('hide');
        }

        if (nowPlayingVolumeSlider) {
            // PUFFERFIN: the upstream volume slider stays hidden, the short bar replaces it
            if (!nowPlayingVolumeSlider.dragging) {
                nowPlayingVolumeSlider.value = volumeLevel || 0;
            }
        }
    }

    async function updatePlaylist() {
        try {
            const playlist = await playbackManager.getPlaylist();

            if (playlist && playlist.length > 1) {
                const btnPreviousTrack = view.querySelector('.btnPreviousTrack');
                const btnNextTrack = view.querySelector('.btnNextTrack');
                btnPreviousTrack.classList.remove('hide');
                btnNextTrack.classList.remove('hide');
                btnPreviousTrack.disabled = false;
                btnNextTrack.disabled = false;
            }
        } catch (err) {
            console.error('[VideoPlayer] failed to get playlist', err);
        }
    }

    function updateTimeText(elem, ticks, divider) {
        if (ticks == null) {
            elem.innerHTML = '';
            return;
        }

        let html = datetime.getDisplayRunningTime(ticks);

        if (divider) {
            html = '&nbsp;/&nbsp;' + html;
        }

        elem.innerHTML = html;
    }

    function nowPlayingDurationTextClick() {
        userSettings.enableVideoRemainingTime(!userSettings.enableVideoRemainingTime());
        // immediately update the text, without waiting for the next tick update or if the player is paused
        const state = playbackManager.getPlayerState(currentPlayer);
        const playState = state.PlayState;
        const nowPlayingItem = state.NowPlayingItem;
        updateTimeDisplay(playState.PositionTicks, nowPlayingItem.RunTimeTicks, playState.PlaybackStartTimeTicks, playState.PlaybackRate, playState.BufferedRanges || []);
    }

    // PUFFERFIN: the settings open in a panel of the player: quality, speed and
    // aspect ratio with their lists, then the switches for the next episode and the intro
    function getQualitySetting(player, user, state) {
        const supportedCommands = playbackManager.getSupportedCommands(player);
        if (!state.MediaSource?.SupportsTranscoding || !supportedCommands.includes('SetMaxStreamingBitrate')
                || !user?.Policy?.EnableVideoPlaybackTranscoding) {
            return undefined;
        }

        const videoStream = (playbackManager.currentMediaSource(player)?.MediaStreams || []).find(stream => stream.Type === 'Video');
        const options = qualityoptions.getVideoQualityOptions({
            currentMaxBitrate: playbackManager.getMaxStreamingBitrate(player),
            isAutomaticBitrateEnabled: playbackManager.enableAutomaticBitrateDetection(player),
            videoCodec: videoStream?.Codec,
            videoBitRate: videoStream?.BitRate,
            videoWidth: videoStream?.Width,
            videoHeight: videoStream?.Height,
            enableAuto: true
        });
        const selected = options.find(option => option.selected);
        let value = selected?.name || '';
        if (selected?.autoText) {
            value += state.PlayState?.PlayMethod !== 'Transcode' ? ' · Direct' : ' · ' + selected.autoText;
        }

        return {
            value,
            options: options.map(option => ({
                label: option.name,
                aside: option.secondaryText || undefined,
                selected: !!option.selected,
                onSelect: () => {
                    const bitrate = parseInt(option.bitrate, 10) || 0;
                    if (bitrate !== (parseInt(selected?.bitrate, 10) || 0)) {
                        playbackManager.setMaxStreamingBitrate({
                            enableAutomaticBitrateDetection: !bitrate,
                            maxBitrate: bitrate
                        }, player);
                    }
                }
            }))
        };
    }

    function getSettingsModel(player, user) {
        const state = playbackManager.getPlayerState(player);
        const supportedCommands = playbackManager.getSupportedCommands(player);
        const model = { locale: globalize.getCurrentLocale() };

        model.quality = getQualitySetting(player, user, state);

        if (supportedCommands.includes('PlaybackRate')) {
            model.speed = {
                current: Number(playbackManager.getPlaybackRate(player)) || 1,
                rates: playbackManager.getSupportedPlaybackRates(player).map(rate => Number(rate.id)),
                select: rate => playbackManager.setPlaybackRate(rate, player)
            };
        }

        if (supportedCommands.includes('SetAspectRatio')) {
            const currentId = playbackManager.getAspectRatio(player);
            const ratios = playbackManager.getSupportedAspectRatios(player);
            model.aspectRatio = {
                value: ratios.find(ratio => ratio.id === currentId)?.name || '',
                options: ratios.map(ratio => ({
                    label: ratio.name,
                    selected: ratio.id === currentId,
                    onSelect: () => playbackManager.setAspectRatio(ratio.id, player)
                }))
            };
        }

        if (playbackManager.supportSubtitleOffset(player) && playbackManager.canHandleOffsetOnCurrentSubtitle(player)) {
            model.subtitleOffset = () => {
                panels.close();
                onSettingsOption('suboffset');
            };
        }

        model.stats = () => {
            panels.close();
            onSettingsOption('stats');
        };

        if (currentItem?.Type === 'Episode' && user?.Configuration) {
            model.autoNext = {
                checked: !!user.Configuration.EnableNextEpisodeAutoPlay,
                set: checked => {
                    // The user object is the cached one: the player reads the new value at the end of this episode
                    user.Configuration.EnableNextEpisodeAutoPlay = checked;
                    const apiClient = ServerConnections.getApiClient(currentItem.ServerId);
                    apiClient.updateUserConfiguration(user.Id, user.Configuration).catch(err => {
                        console.error('[VideoPlayer] failed to save the next episode setting', err);
                    });
                }
            };
        }

        model.autoSkipIntro = {
            checked: getMediaSegmentAction(userSettings, MediaSegmentType.Intro) === MediaSegmentAction.Skip,
            set: checked => {
                userSettings.set(getSegmentSettingId(MediaSegmentType.Intro), checked ? MediaSegmentAction.Skip : MediaSegmentAction.AskToSkip, false);
            }
        };

        return model;
    }

    function onSettingsButtonClick() {
        const btn = this;
        const player = currentPlayer;
        if (!player) return;

        if (panels.isOpen('settings')) {
            panels.close();
            return;
        }

        const currentItemOfPlayer = playbackManager.currentItem(player);
        const userPromise = currentItemOfPlayer?.ServerId ?
            ServerConnections.getApiClient(currentItemOfPlayer.ServerId).getCurrentUser().catch(() => null) :
            Promise.resolve(null);

        userPromise.then(user => {
            if (player !== currentPlayer) return;
            const model = getSettingsModel(player, user);
            panels.open('settings', btn, playerText('Player.Settings'), panel => renderSettingsPanel(panel, model));
        });
    }

    function onSettingsOption(selectedOption) {
        if (selectedOption === 'stats') {
            toggleStats();
        } else if (selectedOption === 'suboffset') {
            const player = currentPlayer;
            if (player) {
                playbackManager.enableShowingSubtitleOffset(player);
                toggleSubtitleSync();
            }
        }
    }

    function toggleStats() {
        import('components/playerstats/playerstats').then(({ default: PlayerStats }) => {
            const player = currentPlayer;

            if (player) {
                if (statsOverlay) {
                    statsOverlay.toggle();
                } else {
                    statsOverlay = new PlayerStats({
                        player: player
                    });
                }
            }
        });
    }

    function destroyStats() {
        if (statsOverlay) {
            statsOverlay.destroy();
            statsOverlay = null;
        }
    }

    // PUFFERFIN: the audio tracks and the subtitles side by side, in a panel of the player
    function renderTracks(panel) {
        const player = currentPlayer;
        if (!player) return;
        renderTracksPanel(panel, {
            audio: playbackManager.audioTracks(player),
            audioIndex: playbackManager.getAudioStreamIndex(player),
            subtitles: playbackManager.subtitleTracks(player),
            subtitleIndex: playbackManager.getSubtitleStreamIndex(player),
            setAudio: index => {
                playbackManager.setAudioStreamIndex(index, player);
                panels.refresh();
            },
            setSubtitles: index => {
                playbackManager.setSubtitleStreamIndex(index, player);
                toggleSubtitleSync();
                panels.refresh();
            }
        });
    }

    function showTracksPanel() {
        if (!currentPlayer) return;
        panels.toggle('tracks', this, playerText('Player.AudioAndSubtitles'), renderTracks);
    }

    // PUFFERFIN: the episodes of the series, in a drawer beside the picture
    function updateEpisodesAvailability(item) {
        const isAvailable = item?.Type === 'Episode' && !!item.SeriesId;
        episodesControl.setAvailable(isAvailable);
        legacyEpisodesButton?.classList.toggle('hide', !isAvailable);
        if (!isAvailable && panels.isOpen('episodes')) panels.close(false);
    }

    function getEpisodeImageUrl(apiClient, episode) {
        const options = { maxWidth: 320, quality: 90 };
        if (episode.ImageTags?.Primary) {
            return apiClient.getScaledImageUrl(episode.Id, { ...options, type: 'Primary', tag: episode.ImageTags.Primary });
        }
        if (episode.ParentThumbItemId && episode.ParentThumbImageTag) {
            return apiClient.getScaledImageUrl(episode.ParentThumbItemId, { ...options, type: 'Thumb', tag: episode.ParentThumbImageTag });
        }
        if (episode.ParentBackdropItemId && episode.ParentBackdropImageTags?.length) {
            return apiClient.getScaledImageUrl(episode.ParentBackdropItemId, { ...options, type: 'Backdrop', tag: episode.ParentBackdropImageTags[0] });
        }
        return undefined;
    }

    async function playEpisode(episode) {
        panels.close(false);
        const player = currentPlayer;
        try {
            // An episode already in the queue plays from there, the queue goes on after it
            const playlist = await playbackManager.getPlaylist(player);
            const queued = playlist?.find(entry => entry.Id === episode.Id);
            if (queued?.PlaylistItemId) {
                playbackManager.setCurrentPlaylistItem(queued.PlaylistItemId, player);
                return;
            }
        } catch (err) {
            console.error('[VideoPlayer] failed to read the queue', err);
        }

        const resumeTicks = !episode.UserData?.Played ? episode.UserData?.PlaybackPositionTicks || 0 : 0;
        playbackManager.play({
            items: [ episode ],
            startPositionTicks: resumeTicks
        }).catch(err => {
            console.error('[VideoPlayer] failed to play the episode', err);
        });
    }

    function toggleEpisodes(trigger) {
        const item = currentItem;
        if (!item?.SeriesId) return;
        const apiClient = ServerConnections.getApiClient(item.ServerId);
        const userId = apiClient.getCurrentUserId();
        const fields = 'PrimaryImageAspectRatio';

        panels.toggle('episodes', trigger, playerText('Player.Episodes'), panel => renderEpisodesPanel(panel, {
            currentId: item.Id,
            currentSeasonId: item.SeasonId,
            loadSeasons: () => apiClient.getSeasons(item.SeriesId, { userId, Fields: fields }).then(result => result.Items || []),
            loadEpisodes: seasonId => apiClient.getEpisodes(item.SeriesId, {
                seasonId,
                userId,
                Fields: fields,
                EnableImageTypes: 'Primary,Thumb,Backdrop',
                ImageTypeLimit: 1
            }).then(result => result.Items || []),
            imageUrl: episode => getEpisodeImageUrl(apiClient, episode),
            positionTicks: () => (currentPlayer ? playbackManager.currentTime(currentPlayer) * 10000 : 0),
            play: playEpisode,
            close: () => panels.close()
        }));
    }

    function toggleSubtitleSync(action) {
        const player = currentPlayer;
        if (subtitleSyncOverlay) {
            subtitleSyncOverlay.toggle(action);
        } else if (player) {
            subtitleSyncOverlay = new SubtitleSync(player);
        }
    }

    function destroySubtitleSync() {
        if (subtitleSyncOverlay) {
            subtitleSyncOverlay.destroy();
            subtitleSyncOverlay = null;
        }
    }

    /**
         * Clicked element.
         * To skip 'click' handling on Firefox/Edge.
         */
    let clickedElement;

    function onClickCapture(e) {
        // Firefox/Edge emits `click` even if `preventDefault` was used on `keydown`
        // Ignore 'click' if another element was originally clicked
        if (!e.target.contains(clickedElement)) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }

    function onKeyDown(e) {
        clickedElement = e.target;

        const isKeyModified = e.ctrlKey || e.altKey || e.metaKey;

        // Skip modified keys
        if (isKeyModified) return;

        const key = keyboardnavigation.getKeyName(e);

        const btnPlayPause = osdBottomElement.querySelector('.btnPause');

        // PUFFERFIN: Escape and Back close an open panel first
        if (panels.isOpen() && (key === 'Escape' || key === 'Back' || key === 'BrowserBack' || key === 'GoBack')) {
            panels.close();
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if (e.keyCode === 32) {
            if (e.target.tagName !== 'BUTTON' || !layoutManager.tv) {
                playbackManager.playPause(currentPlayer);
                showOsd(btnPlayPause);
                e.preventDefault();
                e.stopPropagation();
                // Trick Firefox with a null element to skip next click
                clickedElement = null;
            } else {
                showOsd();
            }
            return;
        }

        if (layoutManager.tv && !currentVisibleMenu) {
            // Change the behavior of some keys when the OSD is hidden
            switch (key) {
                case 'ArrowLeft':
                case 'ArrowRight':
                    if (!e.shiftKey) {
                        e.preventDefault();
                        showOsd(nowPlayingPositionSlider);
                        nowPlayingPositionSlider.dispatchEvent(new KeyboardEvent(e.type, e));
                    }
                    return;
                case 'Enter':
                    if (e.target.tagName !== 'BUTTON') {
                        e.preventDefault();
                        playbackManager.playPause(currentPlayer);
                        showOsd(btnPlayPause);
                    }
                    return;
            }
        }

        if (layoutManager.tv && keyboardnavigation.isNavigationKey(key)) {
            if (!e.shiftKey) showOsd();
            return;
        }

        if (key.startsWith('Digit') || key.startsWith('Numpad')) {
            const num = parseInt(key.replace('Digit', '').replace('Numpad', ''), 10);
            if (!isNaN(num) && num >= 0 && num <= 9) {
                playbackManager.seekPercent(num * 10, currentPlayer);
                return;
            }
        }

        switch (key) {
            case 'Enter':
                showOsd();
                break;
            case 'Escape':
            case 'Back':
                // Ignore key when some dialog is opened
                if (currentVisibleMenu === 'osd' && !getOpenedDialog()) {
                    hideOsd();
                    e.stopPropagation();
                }
                break;
            case 'KeyK':
                if (!e.shiftKey) {
                    e.preventDefault();
                    playbackManager.playPause(currentPlayer);
                    showOsd(btnPlayPause);
                }
                break;
            case 'ArrowUp':
            case 'Up':
                if (!e.shiftKey) {
                    e.preventDefault();
                    playbackManager.volumeUp(currentPlayer);
                }
                break;
            case 'ArrowDown':
            case 'Down':
                if (!e.shiftKey) {
                    e.preventDefault();
                    playbackManager.volumeDown(currentPlayer);
                }
                break;
            case 'KeyL':
            case 'ArrowRight':
            case 'Right':
                if (!e.shiftKey) {
                    e.preventDefault();
                    playbackManager.fastForward(currentPlayer);
                    showOsd(btnFastForward);
                }
                break;
            case 'Comma':
                e.preventDefault();
                if (!e.shiftKey) {
                    playbackManager.seekFrames(-1, currentPlayer);
                } else {
                    playbackManager.decreasePlaybackRate(currentPlayer);
                }
                break;
            case 'Period':
                e.preventDefault();
                if (!e.shiftKey) {
                    playbackManager.seekFrames(1, currentPlayer);
                } else {
                    playbackManager.increasePlaybackRate(currentPlayer);
                }
                break;
            case 'KeyJ':
            case 'ArrowLeft':
            case 'Left':
                if (!e.shiftKey) {
                    e.preventDefault();
                    playbackManager.rewind(currentPlayer);
                    showOsd(btnRewind);
                }
                break;
            case 'KeyF':
                if (!e.shiftKey) {
                    e.preventDefault();
                    playbackManager.toggleFullscreen(currentPlayer);
                }
                break;
            case 'KeyM':
                if (!e.shiftKey) {
                    e.preventDefault();
                    playbackManager.toggleMute(currentPlayer);
                }
                break;
            case 'KeyP':
                if (e.shiftKey) {
                    e.preventDefault();
                    playbackManager.previousTrack(currentPlayer);
                }
                break;
            case 'KeyN':
                if (e.shiftKey) {
                    e.preventDefault();
                    playbackManager.nextTrack(currentPlayer);
                }
                break;
            case 'NavigationLeft':
            case 'GamepadDPadLeft':
            case 'GamepadLeftThumbstickLeft':
                // Ignores gamepad events that are always triggered, even when not focused.
                if (document.hasFocus()) {
                    playbackManager.rewind(currentPlayer);
                    showOsd(btnRewind);
                }
                break;
            case 'NavigationRight':
            case 'GamepadDPadRight':
            case 'GamepadLeftThumbstickRight':
                // Ignores gamepad events that are always triggered, even when not focused.
                if (document.hasFocus()) {
                    playbackManager.fastForward(currentPlayer);
                    showOsd(btnFastForward);
                }
                break;
            case 'Home':
                if (!e.shiftKey) {
                    e.preventDefault();
                    playbackManager.seekPercent(0, currentPlayer);
                }
                break;
            case 'End':
                if (!e.shiftKey) {
                    e.preventDefault();
                    playbackManager.seekPercent(100, currentPlayer);
                }
                break;
            case 'PageUp':
                if (!e.shiftKey) {
                    e.preventDefault();
                    playbackManager.nextChapter(currentPlayer);
                }
                break;
            case 'PageDown':
                if (!e.shiftKey) {
                    e.preventDefault();
                    playbackManager.previousChapter(currentPlayer);
                }
                break;
            case 'KeyG':
                if (!e.shiftKey) {
                    e.preventDefault();
                    subtitleSyncOverlay?.decrementOffset();
                }
                break;
            case 'KeyH':
                if (!e.shiftKey) {
                    e.preventDefault();
                    subtitleSyncOverlay?.incrementOffset();
                }
                break;
        }
    }

    function onKeyDownCapture() {
        resetIdle();
    }

    function onWheel(e) {
        if (getOpenedDialog()) return;
        // A wheel over a panel, the episodes drawer or a menu scrolls it: it never changes the volume
        if (document.documentElement.classList.contains(PANEL_OPEN_CLASS)) return;
        if (e.target instanceof Element && e.target.closest('.pf-osd-panel, .pf-osd-episodes, .pf-osd-scrim, [role="menu"], [role="dialog"], [role="listbox"], .upNextContainer')) return;
        if (e.deltaY < 0) {
            playbackManager.volumeUp(currentPlayer);
        }
        if (e.deltaY > 0) {
            playbackManager.volumeDown(currentPlayer);
        }
    }

    function onWindowMouseDown(e) {
        clickedElement = e.target;
        mouseIsDown = true;
        resetIdle();
    }

    function onWindowMouseUp() {
        mouseIsDown = false;
        resetIdle();
    }

    function onWindowDragEnd() {
        // mousedown -> dragstart -> dragend !!! no mouseup :(
        mouseIsDown = false;
        resetIdle();
    }

    // PUFFERFIN: above the pointer on the timeline, the picture at that time
    // framed in white, then a small tag with the time and the chapter
    const SCRUB_WIDTH = 176;

    function getScrubLabelHtml(timeText, chapterName) {
        let html = '<div class="pf-scrub__label"><span class="pf-scrub__time">' + escapeHtml(timeText) + '</span>';
        html += '<span class="pf-scrub__chapter">' + (chapterName ? ' · ' + escapeHtml(chapterName) : '') + '</span>';
        return html + '</div>';
    }

    function getChapterNameAt(item, positionTicks) {
        return getChapterAt(item?.Chapters, positionTicks)?.chapter.Name || '';
    }

    function updateTrickplayBubbleHtml(apiClient, trickplayInfo, item, mediaSourceId, bubble, positionTicks) {
        let container = bubble.querySelector('.pf-scrub--trickplay');

        // Built once per size of picture, then only its position moves
        if (!container || container.dataset.width !== String(trickplayInfo.Width)) {
            const scale = SCRUB_WIDTH / trickplayInfo.Width;
            bubble.innerHTML = '<div class="pf-scrub pf-scrub--trickplay" data-width="' + trickplayInfo.Width + '">'
                + '<div class="pf-scrub__frame" style="width:' + SCRUB_WIDTH + 'px;height:' + Math.round(trickplayInfo.Height * scale) + 'px">'
                + '<div class="pf-scrub__tile" style="width:' + trickplayInfo.Width + 'px;height:' + trickplayInfo.Height + 'px;transform:scale(' + scale + ')"></div>'
                + '</div>'
                + getScrubLabelHtml('', '')
                + '</div>';
            container = bubble.querySelector('.pf-scrub--trickplay');
        }

        const currentTimeMs = positionTicks / 10_000;
        const currentTile = Math.floor(currentTimeMs / trickplayInfo.Interval);

        const tileSize = trickplayInfo.TileWidth * trickplayInfo.TileHeight;
        const tileOffset = currentTile % tileSize;
        const index = Math.floor(currentTile / tileSize);

        const tileOffsetX = tileOffset % trickplayInfo.TileWidth;
        const tileOffsetY = Math.floor(tileOffset / trickplayInfo.TileWidth);
        const offsetX = -(tileOffsetX * trickplayInfo.Width);
        const offsetY = -(tileOffsetY * trickplayInfo.Height);

        const imgSrc = apiClient.getUrl('Videos/' + item.Id + '/Trickplay/' + trickplayInfo.Width + '/' + index + '.jpg', {
            ApiKey: apiClient.accessToken(),
            MediaSourceId: mediaSourceId
        });

        const tile = container.querySelector('.pf-scrub__tile');
        tile.style.backgroundImage = `url('${imgSrc}')`;
        tile.style.backgroundPositionX = offsetX + 'px';
        tile.style.backgroundPositionY = offsetY + 'px';

        const chapterName = getChapterNameAt(item, positionTicks);
        container.querySelector('.pf-scrub__time').textContent = datetime.getDisplayRunningTime(positionTicks);
        container.querySelector('.pf-scrub__chapter').textContent = chapterName ? ' · ' + chapterName : '';

        return true;
    }

    function getImgUrl(item, chapter, index, maxWidth, apiClient) {
        if (chapter.ImageTag) {
            const chapterItemId = currentPlayer?.streamInfo?.mediaSource?.Id || item.Id;

            return apiClient.getScaledImageUrl(chapterItemId, {
                maxWidth: maxWidth,
                tag: chapter.ImageTag,
                type: 'Chapter',
                index: index
            });
        }

        return null;
    }

    function getChapterBubbleHtml(apiClient, item, chapters, positionTicks) {
        const found = getChapterAt(chapters, positionTicks);
        if (!found) {
            return null;
        }

        const src = getImgUrl(item, found.chapter, found.index, 400, apiClient);
        let html = '<div class="pf-scrub">';

        if (src) {
            html += '<div class="pf-scrub__frame" style="width:' + SCRUB_WIDTH + 'px"><img class="pf-scrub__image" alt="" src="' + escapeHtml(src) + '" /></div>';
        }

        html += getScrubLabelHtml(datetime.getDisplayRunningTime(positionTicks), found.chapter.Name);

        return html + '</div>';
    }

    let playPauseClickTimeout;
    function onViewHideStopPlayback() {
        if (playbackManager.isPlayingVideo()) {
            shell.disableFullscreen();

            clearTimeout(playPauseClickTimeout);
            const player = currentPlayer;
            view.removeEventListener('viewbeforehide', onViewHideStopPlayback);
            releaseCurrentPlayer();
            playbackManager.stop(player);
        }
    }

    function enableStopOnBack(enabled) {
        view.removeEventListener('viewbeforehide', onViewHideStopPlayback);

        if (enabled && playbackManager.isPlayingVideo(currentPlayer)) {
            view.addEventListener('viewbeforehide', onViewHideStopPlayback);
        }
    }

    function updatePlaybackRate(player) {
        // Restore playback speed control, if it exists in the session.
        const playbackRateSpeed = sessionStorage.getItem('playbackRateSpeed');
        if (playbackRateSpeed !== null) {
            player.setPlaybackRate(playbackRateSpeed);
        }
    }

    shell.enableFullscreen();

    let currentPlayer;
    let comingUpNextDisplayed;
    let currentUpNextDialog;
    let isEnabled;
    let currentItem;
    let recordingButtonManager;
    let enableProgressByTimeOfDay;
    let currentVisibleMenu;
    let statsOverlay;
    let osdHideTimeout;
    let lastPointerMoveData;
    const self = this;
    let currentPlayerSupportedCommands = [];
    let currentRuntimeTicks = 0;
    let lastUpdateTime = 0;
    let programStartDateMs = 0;
    let programEndDateMs = 0;
    let playbackStartTimeTicks = 0;
    let subtitleSyncOverlay;
    let trickplayResolution = null;
    const nowPlayingVolumeSlider = view.querySelector('.osdVolumeSlider');
    const nowPlayingPositionSlider = view.querySelector('.osdPositionSlider');
    const nowPlayingPositionText = view.querySelector('.osdPositionText');
    const nowPlayingDurationText = view.querySelector('.osdDurationText');
    const startTimeText = view.querySelector('.startTimeText');
    const endTimeText = view.querySelector('.endTimeText');
    const endsAtText = view.querySelector('.endsAtText');
    const btnRewind = view.querySelector('.btnRewind');
    const btnFastForward = view.querySelector('.btnFastForward');
    const transitionEndEventName = dom.whichTransitionEvent();
    const headerElement = document.querySelector('.skinHeader');
    const osdBottomElement = view.querySelector('.videoOsdBottom-maincontrols');

    // PUFFERFIN: the short volume bar beside the mute button
    const inlineVolume = createInlineVolume({
        container: view.querySelector('.volumeButtons'),
        setVolume: volume => playbackManager.setVolume(volume, currentPlayer),
        setMuted: muted => playbackManager.setMute(muted, currentPlayer),
        label: globalize.translate('Volume')
    });
    enableButtonHints(view);

    // PUFFERFIN: the panels of the player; one open holds the controls on screen
    const panels = createPanelHost({
        root: view,
        onOpenChange: isOpen => {
            if (isOpen) {
                stopOsdHideTimer();
            } else {
                resetIdle();
            }
            episodesControl.setOpen(isOpen && panels.isOpen('episodes'));
            syncPlayControl.setOpen(isOpen && panels.isOpen('syncplay'));
        }
    });

    // PUFFERFIN: the SyncPlay panel, opened by the SyncPlay button of the header
    let syncPlayUser = null;
    const syncPlayPanel = createSyncPlayPanel({
        snapshot: syncPlayStore.getSnapshot,
        userName: () => syncPlayUser?.Name,
        canCreate: () => syncPlayUser?.Policy?.SyncPlayAccess === 'CreateAndJoinGroups',
        refresh: () => {
            if (panels.isOpen('syncplay')) panels.refresh();
        }
    });
    function toggleSyncPlay(trigger) {
        panels.toggle('syncplay', trigger, playerText('SyncPlayTitle'), syncPlayPanel);
    }
    let unsubscribeSyncPlay = null;
    // The legacy header of a TV keeps its SyncPlay button: it opens the same panel
    const onHeaderSyncClick = (event) => {
        const button = event.target?.closest?.('.headerSyncButton');
        if (!button) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        toggleSyncPlay(button);
    };

    // PUFFERFIN: the header of the legacy layouts gets its own Episodes button;
    // the header of the other layouts draws it with React
    let legacyEpisodesButton = null;
    const legacyHeaderActions = headerElement?.querySelector('.headerRight');
    if (legacyHeaderActions) {
        legacyEpisodesButton = document.createElement('button');
        legacyEpisodesButton.type = 'button';
        legacyEpisodesButton.className = 'headerButton headerButtonRight paper-icon-button-light pf-headerEpisodes hide';
        legacyEpisodesButton.setAttribute(PANEL_TOGGLE_ATTRIBUTE, '');
        legacyEpisodesButton.setAttribute('aria-haspopup', 'dialog');
        legacyEpisodesButton.innerHTML = ICONS.list + '<span class="pf-headerEpisodes__text"></span>';
        legacyEpisodesButton.addEventListener('click', function () {
            toggleEpisodes(this);
        });
        legacyHeaderActions.prepend(legacyEpisodesButton);
    }

    nowPlayingPositionSlider.enableKeyboardDragging();
    nowPlayingVolumeSlider.enableKeyboardDragging();

    if (layoutManager.tv) {
        nowPlayingPositionSlider.classList.add('focusable');
    }

    nowPlayingDurationText.addEventListener('click', nowPlayingDurationTextClick);

    view.addEventListener('viewbeforeshow', function () {
        headerElement.classList.add('osdHeader');
        setBackdropTransparency(TRANSPARENCY_LEVEL.Full);
    });
    view.addEventListener('viewshow', function () {
        try {
            // PUFFERFIN: the words of the panels, and the Episodes button of the header
            loadPlayerText().then(() => {
                if (legacyEpisodesButton) legacyEpisodesButton.querySelector('.pf-headerEpisodes__text').textContent = playerText('Player.Episodes');
            });
            episodesControl.setToggleHandler(toggleEpisodes);
            syncPlayControl.setToggleHandler(toggleSyncPlay);
            unsubscribeSyncPlay?.();
            unsubscribeSyncPlay = syncPlayStore.subscribe(() => {
                if (panels.isOpen('syncplay')) panels.refresh();
            });
            headerElement?.querySelector('.headerSyncButton')?.setAttribute(PANEL_TOGGLE_ATTRIBUTE, '');
            headerElement?.addEventListener('click', onHeaderSyncClick, true);
            ServerConnections.currentApiClient()?.getCurrentUser().then((user) => {
                syncPlayUser = user;
            }).catch(() => undefined);
            Events.on(playbackManager, 'playerchange', onPlayerChange);
            bindToPlayer(playbackManager.getCurrentPlayer());
            /* eslint-disable-next-line compat/compat */
            dom.addEventListener(document, window.PointerEvent ? 'pointermove' : 'mousemove', onPointerMove, {
                passive: true
            });
            showOsd();
            inputManager.on(window, onInputCommand);
            document.addEventListener('keydown', onKeyDown);
            dom.addEventListener(document, 'keydown', onKeyDownCapture, {
                capture: true,
                passive: true
            });
            document.addEventListener('wheel', onWheel);
            /* eslint-disable-next-line compat/compat */
            dom.addEventListener(window, window.PointerEvent ? 'pointerdown' : 'mousedown', onWindowMouseDown, {
                capture: true,
                passive: true
            });
            /* eslint-disable-next-line compat/compat */
            dom.addEventListener(window, window.PointerEvent ? 'pointerup' : 'mouseup', onWindowMouseUp, {
                capture: true,
                passive: true
            });
            dom.addEventListener(window, 'touchstart', onWindowMouseDown, {
                capture: true,
                passive: true
            });
            ['touchend', 'touchcancel'].forEach((event) => {
                dom.addEventListener(window, event, onWindowMouseUp, {
                    capture: true,
                    passive: true
                });
            });
            dom.addEventListener(window, 'dragend', onWindowDragEnd, {
                capture: true,
                passive: true
            });
            if (browser.firefox || browser.edge) {
                dom.addEventListener(document, 'click', onClickCapture, { capture: true });
            }
        } catch {
            setBackdropTransparency(TRANSPARENCY_LEVEL.None); // reset state set in viewbeforeshow
            appRouter.goHome();
        }
    });
    view.addEventListener('viewbeforehide', function () {
        panels.close(false);
        episodesControl.setToggleHandler(null);
        episodesControl.setAvailable(false);
        syncPlayControl.setToggleHandler(null);
        syncPlayControl.setOpen(false);
        unsubscribeSyncPlay?.();
        unsubscribeSyncPlay = null;
        headerElement?.removeEventListener('click', onHeaderSyncClick, true);
        headerElement?.querySelector('.headerSyncButton')?.removeAttribute(PANEL_TOGGLE_ATTRIBUTE);
        if (statsOverlay) {
            statsOverlay.enabled(false);
        }

        document.removeEventListener('keydown', onKeyDown);
        dom.removeEventListener(document, 'keydown', onKeyDownCapture, {
            capture: true,
            passive: true
        });
        document.removeEventListener('wheel', onWheel);
        /* eslint-disable-next-line compat/compat */
        dom.removeEventListener(window, window.PointerEvent ? 'pointerdown' : 'mousedown', onWindowMouseDown, {
            capture: true,
            passive: true
        });
        /* eslint-disable-next-line compat/compat */
        dom.removeEventListener(window, window.PointerEvent ? 'pointerup' : 'mouseup', onWindowMouseUp, {
            capture: true,
            passive: true
        });
        dom.removeEventListener(window, 'touchstart', onWindowMouseDown, {
            capture: true,
            passive: true
        });
        ['touchend', 'touchcancel'].forEach((event) => {
            dom.removeEventListener(window, event, onWindowMouseUp, {
                capture: true,
                passive: true
            });
        });
        dom.removeEventListener(window, 'dragend', onWindowDragEnd, {
            capture: true,
            passive: true
        });
        if (browser.firefox || browser.edge) {
            dom.removeEventListener(document, 'click', onClickCapture, { capture: true });
        }
        stopOsdHideTimer();
        headerElement.classList.remove('osdHeader');
        headerElement.classList.remove('osdHeader-hidden');
        /* eslint-disable-next-line compat/compat */
        dom.removeEventListener(document, window.PointerEvent ? 'pointermove' : 'mousemove', onPointerMove, {
            passive: true
        });
        inputManager.off(window, onInputCommand);
        Events.off(playbackManager, 'playerchange', onPlayerChange);
        releaseCurrentPlayer();
    });
    view.querySelector('.btnFullscreen').addEventListener('click', function () {
        playbackManager.toggleFullscreen(currentPlayer);
    });
    view.querySelector('.btnPip').addEventListener('click', function () {
        playbackManager.togglePictureInPicture(currentPlayer);
    });
    view.querySelector('.btnAirPlay').addEventListener('click', function () {
        playbackManager.toggleAirPlay(currentPlayer);
    });
    view.querySelector('.btnVideoOsdSettings').addEventListener('click', onSettingsButtonClick);
    view.addEventListener('viewhide', function () {
        clearHideAnimationEventListeners(headerElement);
        headerElement.classList.remove('hide');
    });
    view.addEventListener('viewdestroy', function () {
        if (self.touchHelper) {
            self.touchHelper.destroy();
            self.touchHelper = null;
        }

        if (recordingButtonManager) {
            recordingButtonManager.destroy();
            recordingButtonManager = null;
        }

        destroyStats();
        destroySubtitleSync();
        panels.destroy();
        inlineVolume.destroy();
        legacyEpisodesButton?.remove();
    });
    let lastPointerDown = 0;
    /* eslint-disable-next-line compat/compat */
    dom.addEventListener(view, window.PointerEvent ? 'pointerdown' : 'click', function (e) {
        if (dom.parentWithClass(e.target, ['videoOsdBottom', 'upNextContainer', 'pf-osd-panel'])) {
            showOsd();
            return;
        }

        // PUFFERFIN: a click that closed a panel does not also pause the video
        if (panels.wasJustDismissed()) {
            return;
        }

        const pointerType = e.pointerType || (layoutManager.mobile ? 'touch' : 'mouse');
        const now = new Date().getTime();

        switch (pointerType) {
            case 'touch':
                if (now - lastPointerDown > 300) {
                    lastPointerDown = now;
                    toggleOsd();
                }

                break;

            case 'mouse':
                if (!e.button) {
                    if (playPauseClickTimeout) {
                        clearTimeout(playPauseClickTimeout);
                        playPauseClickTimeout = 0;
                    } else {
                        playPauseClickTimeout = setTimeout(function() {
                            playbackManager.playPause(currentPlayer);
                            showOsd();
                            playPauseClickTimeout = 0;
                        }, 300);
                    }
                }

                break;

            default:
                playbackManager.playPause(currentPlayer);
                showOsd();
        }
    }, {
        passive: true
    });

    dom.addEventListener(view, 'dblclick', (e) => {
        if (e.target !== view) return;
        playbackManager.toggleFullscreen(currentPlayer);
    });

    // PUFFERFIN: the volume button mutes; the bar beside it sets the volume
    view.querySelector('.buttonMute').addEventListener('click', function () {
        playbackManager.toggleMute(currentPlayer);
    });

    nowPlayingVolumeSlider.addEventListener('input', (e) => {
        playbackManager.setVolume(e.target.value, currentPlayer);
    });

    nowPlayingPositionSlider.addEventListener('change', function () {
        const player = currentPlayer;

        if (player) {
            const newPercent = parseFloat(this.value);

            if (enableProgressByTimeOfDay) {
                let seekAirTimeTicks = newPercent / 100 * (programEndDateMs - programStartDateMs) * 1e4;
                seekAirTimeTicks += 1e4 * programStartDateMs;
                seekAirTimeTicks -= playbackStartTimeTicks;
                playbackManager.seek(seekAirTimeTicks, player);
            } else {
                playbackManager.seekPercent(newPercent, player);
            }
        }
    });

    nowPlayingPositionSlider.addEventListener('keydown', function (e) {
        if (e.defaultPrevented) return;

        const key = keyboardnavigation.getKeyName(e);
        if (key === 'Enter') {
            playbackManager.playPause(currentPlayer);
        }
    });

    nowPlayingPositionSlider.updateBubbleHtml = function(bubble, value) {
        showOsd();

        const item = currentItem;
        const ticks = currentRuntimeTicks * value / 100;

        if (trickplayResolution && item?.Trickplay) {
            return updateTrickplayBubbleHtml(
                ServerConnections.getApiClient(item.ServerId),
                trickplayResolution,
                item,
                currentPlayer.streamInfo.mediaSource.Id,
                bubble,
                ticks);
        }

        return false;
    };

    nowPlayingPositionSlider.getBubbleHtml = function (value) {
        showOsd();
        if (enableProgressByTimeOfDay) {
            if (programStartDateMs && programEndDateMs) {
                let ms = programEndDateMs - programStartDateMs;
                ms /= 100;
                ms *= value;
                ms += programStartDateMs;
                return '<div class="pf-scrub">' + getScrubLabelHtml(getDisplayTimeWithoutAmPm(new Date(parseInt(ms, 10)), true), '') + '</div>';
            }

            return '<div class="pf-scrub">' + getScrubLabelHtml('--:--', '') + '</div>';
        }

        if (!currentRuntimeTicks) {
            return '<div class="pf-scrub">' + getScrubLabelHtml('--:--', '') + '</div>';
        }

        let ticks = currentRuntimeTicks;
        ticks /= 100;
        ticks *= value;
        const item = currentItem;

        if (item?.Chapters?.length) {
            const html = getChapterBubbleHtml(ServerConnections.getApiClient(item.ServerId), item, item.Chapters, ticks);

            if (html) {
                return html;
            }
        }

        return '<div class="pf-scrub">' + getScrubLabelHtml(datetime.getDisplayRunningTime(ticks), '') + '</div>';
    };

    // PUFFERFIN: a notch where each chapter starts, none at the very start
    nowPlayingPositionSlider.getMarkerInfo = function () {
        return getChapterMarkers(currentItem?.Chapters, currentItem?.RunTimeTicks);
    };

    // PUFFERFIN: a white dot follows the pointer along the timeline
    const seekContainer = view.querySelector('.pf-seek');
    seekContainer.addEventListener('pointermove', function (e) {
        const rect = nowPlayingPositionSlider.getBoundingClientRect();
        if (!rect.width) return;
        const fraction = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
        seekContainer.style.setProperty('--pf-scrub-x', (fraction * 100) + '%');
    }, { passive: true });

    view.querySelector('.btnPreviousTrack').addEventListener('click', function () {
        playbackManager.previousTrack(currentPlayer);
    });
    view.querySelector('.btnPreviousChapter').addEventListener('click', function () {
        playbackManager.previousChapter(currentPlayer);
    });
    view.querySelector('.btnPause').addEventListener('click', function () {
        playbackManager.playPause(currentPlayer);
    });
    view.querySelector('.btnNextChapter').addEventListener('click', function () {
        playbackManager.nextChapter(currentPlayer);
    });
    view.querySelector('.btnNextTrack').addEventListener('click', function () {
        playbackManager.nextTrack(currentPlayer);
    });
    btnRewind.addEventListener('click', function () {
        playbackManager.rewind(currentPlayer);
    });
    btnFastForward.addEventListener('click', function () {
        playbackManager.fastForward(currentPlayer);
    });
    view.querySelector('.btnSubtitles').addEventListener('click', showTracksPanel);

    // PUFFERFIN: the state of the SyncPlay group over the picture, in words: a
    // quiet pill at the top, in place of the large pulsing icon
    const syncPlayStatus = createSyncPlayStatus(view);
    view.querySelector('.syncPlayContainer')?.classList.add('hide');
    const showIcon = (action) => {
        const status = statusForAction(action);
        if (status === 'starting') hideOsd();
        if (status === 'paused') showOsd();
        syncPlayStatus.show(status);
    };

    const SyncPlay = pluginManager.firstOfType(PluginType.SyncPlay)?.instance;
    if (SyncPlay) {
        Events.on(SyncPlay.Manager, 'enabled', (_event, enabled) => {
            if (!enabled) {
                syncPlayStatus.show(null);
            }
        });

        Events.on(SyncPlay.Manager, 'notify-osd', (_event, action) => {
            showIcon(action);
        });

        Events.on(SyncPlay.Manager, 'group-state-update', (_event, state, reason) => {
            const status = statusForGroupState(state, reason);
            if (status === undefined) return;
            if (status === 'starting') hideOsd();
            if (status === 'paused') showOsd();
            syncPlayStatus.show(status);
        });
    }
}
