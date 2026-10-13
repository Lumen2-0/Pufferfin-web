import dom from '../../utils/dom';
import { playbackManager } from '../playback/playbackmanager';
import Events from '../../utils/events.ts';
import layoutManager from '../layoutManager';
import focusManager from '../focusManager';
import { ServerConnections } from 'lib/jellyfin-apiclient';
import itemHelper from '../itemHelper';
import escapeHtml from 'escape-html';
import { playerText } from 'apps/pufferfin/features/player/osd/strings';

import './upnextdialog.scss';
import '../../elements/emby-button/emby-button';
import '../../styles/flexstyles.scss';

const transitionEndEventName = dom.whichTransitionEvent();

// PUFFERFIN: a card of the next episode: its picture, "Up next", its name,
// its numbers and the countdown; Play now and Cancel under it, and a thin
// line along the bottom that fills up until it plays
function getHtml() {
    let html = '';

    html += '<div class="pf-upnext">';
    html += '<div class="pf-upnext__row">';
    html += '<div class="pf-upnext__art"><img class="pf-upnext__image" alt="" loading="eager" /></div>';
    html += '<div class="pf-upnext__body">';
    html += '<p class="pf-upnext__eyebrow">' + escapeHtml(playerText('Player.UpNext')) + '</p>';
    html += '<h3 class="upNextDialog-title pf-upnext__title"></h3>';
    html += '<p class="upNextDialog-nextVideoText pf-upnext__meta"></p>';
    html += '</div>';
    html += '</div>';

    html += '<div class="upNextDialog-buttons pf-upnext__buttons">';
    html += '<button type="button" is="emby-button" class="btnStartNow upNextDialog-button pf-upnext__play">';
    html += escapeHtml(playerText('Player.PlayNow'));
    html += '</button>';
    html += '<button type="button" is="emby-button" class="btnHide upNextDialog-button pf-upnext__cancel">';
    html += escapeHtml(playerText('Player.Cancel'));
    html += '</button>';
    html += '</div>';

    html += '<span class="pf-upnext__countdown" aria-hidden="true"><span class="pf-upnext__countdown-fill"></span></span>';
    html += '</div>';

    return html;
}

function setNextVideoText() {
    const instance = this;

    const elem = instance.options.parent;

    const secondsRemaining = Math.max(Math.round(getTimeRemainingMs(instance) / 1000), 0);

    // PUFFERFIN: "S1, E16 · Playing in 10 s", the numbers alone without autoplay
    const parts = [ instance.numbersText ];
    if (!instance.showStaticNextText) parts.push(playerText('Player.PlayingIn', secondsRemaining));
    elem.querySelector('.upNextDialog-nextVideoText').textContent = parts.filter(Boolean).join(' · ');

    // The line along the bottom fills up as the next episode nears
    const countdown = elem.querySelector('.pf-upnext__countdown');
    const fill = elem.querySelector('.pf-upnext__countdown-fill');
    if (countdown && fill) {
        countdown.classList.toggle('hide', !!instance.showStaticNextText);
        if (!instance.showStaticNextText && !instance._countdownStartMs) instance._countdownStartMs = Math.max(getTimeRemainingMs(instance), 1);
        const ratio = instance.showStaticNextText ? 0 : Math.min(Math.max(getTimeRemainingMs(instance) / instance._countdownStartMs, 0), 1);
        fill.style.transform = `scaleX(${1 - ratio})`;
    }
}

function fillItem(item) {
    const instance = this;

    const elem = instance.options.parent;

    // PUFFERFIN: the name of the episode as the title, its numbers under it, its picture beside
    // The name alone: the display name already starts with the numbers of an episode
    const name = item.Type === 'Episode' ? item.Name : itemHelper.getDisplayName(item);
    elem.querySelector('.upNextDialog-title').innerText = name || item.SeriesName || '';
    instance.numbersText = item.Type === 'Episode' && item.ParentIndexNumber != null && item.IndexNumber != null ?
        playerText('Player.EpisodeShort', item.ParentIndexNumber, item.IndexNumber) :
        '';

    const image = elem.querySelector('.pf-upnext__image');
    const imageUrl = getImageUrl(item);
    if (imageUrl) {
        image.src = imageUrl;
        image.classList.remove('hide');
    } else {
        image.classList.add('hide');
    }

    instance.itemType = item.Type;

    instance.show();
}

// The still of the episode, else a thumb or a backdrop of its series
function getImageUrl(item) {
    const apiClient = ServerConnections.getApiClient(item);
    const options = { maxWidth: 480, quality: 90 };
    if (item.ImageTags?.Primary) {
        return apiClient.getScaledImageUrl(item.Id, { ...options, type: 'Primary', tag: item.ImageTags.Primary });
    }
    if (item.ParentThumbItemId && item.ParentThumbImageTag) {
        return apiClient.getScaledImageUrl(item.ParentThumbItemId, { ...options, type: 'Thumb', tag: item.ParentThumbImageTag });
    }
    if (item.ParentBackdropItemId && item.ParentBackdropImageTags?.length) {
        return apiClient.getScaledImageUrl(item.ParentBackdropItemId, { ...options, type: 'Backdrop', tag: item.ParentBackdropImageTags[0] });
    }
    return null;
}

function clearCountdownTextTimeout(instance) {
    if (instance._countdownTextTimeout) {
        clearInterval(instance._countdownTextTimeout);
        instance._countdownTextTimeout = null;
    }
}

async function onStartNowClick() {
    const options = this.options;

    if (options) {
        const player = options.player;

        await this.hide();

        playbackManager.nextTrack(player);
    }
}

async function init(instance, options) {
    instance.showStaticNextText = await showStaticNextText(options.nextItem);

    options.parent.innerHTML = getHtml();

    options.parent.classList.add('hide');
    options.parent.classList.add('upNextDialog');
    options.parent.classList.add('upNextDialog-hidden');

    fillItem.call(instance, options.nextItem);

    options.parent.querySelector('.btnHide').addEventListener('click', instance.hide.bind(instance));
    options.parent.querySelector('.btnStartNow').addEventListener('click', onStartNowClick.bind(instance));
}

function clearHideAnimationEventListeners(instance, elem) {
    const fn = instance._onHideAnimationComplete;

    if (fn) {
        dom.removeEventListener(elem, transitionEndEventName, fn, {
            once: true
        });
    }
}

function onHideAnimationComplete(e) {
    const instance = this;
    const elem = e.target;

    elem.classList.add('hide');

    clearHideAnimationEventListeners(instance, elem);
    Events.trigger(instance, 'hide');
}

async function hideComingUpNext() {
    const instance = this;
    clearCountdownTextTimeout(this);

    if (!instance.options) {
        return;
    }

    const elem = instance.options.parent;

    if (!elem) {
        return;
    }

    clearHideAnimationEventListeners(this, elem);

    if (elem.classList.contains('upNextDialog-hidden')) {
        return;
    }

    const fn = onHideAnimationComplete.bind(instance);
    instance._onHideAnimationComplete = fn;

    const transitionEvent = await new Promise((resolve) => {
        dom.addEventListener(elem, transitionEndEventName, resolve, {
            once: true
        });

        // trigger a reflow to force it to animate again
        void elem.offsetWidth;

        elem.classList.add('upNextDialog-hidden');
    });

    instance._onHideAnimationComplete(transitionEvent);
}

function getTimeRemainingMs(instance) {
    const options = instance.options;
    if (options) {
        const runtimeTicks = playbackManager.duration(options.player);

        if (runtimeTicks) {
            const timeRemainingTicks = runtimeTicks - playbackManager.currentTime(options.player) * 10000;

            return Math.round(timeRemainingTicks / 10000);
        }
    }

    return 0;
}

function startComingUpNextHideTimer(instance) {
    const timeRemainingMs = getTimeRemainingMs(instance);

    if (timeRemainingMs <= 0) {
        return;
    }

    setNextVideoText.call(instance);
    clearCountdownTextTimeout(instance);

    if (!instance.showStaticNextText) instance._countdownTextTimeout = setInterval(setNextVideoText.bind(instance), 400);
}

async function showStaticNextText(nextItem) {
    const apiClient = ServerConnections.getApiClient(nextItem);
    const currentUser = await apiClient.getCurrentUser();
    return !currentUser.Configuration.EnableNextEpisodeAutoPlay;
}

class UpNextDialog {
    constructor(options) {
        this.options = options;
        this.showStaticNextText = false; // default to showing countdown text

        init(this, options);
    }
    show() {
        const elem = this.options.parent;

        clearHideAnimationEventListeners(this, elem);

        elem.classList.remove('hide');

        // trigger a reflow to force it to animate again
        void elem.offsetWidth;

        elem.classList.remove('upNextDialog-hidden');

        if (layoutManager.tv) {
            setTimeout(function () {
                focusManager.focus(elem.querySelector('.btnStartNow'));
            }, 50);
        }

        startComingUpNextHideTimer(this);
    }
    async hide() {
        await hideComingUpNext.bind(this)();
    }
    destroy() {
        hideComingUpNext.call(this);

        this.options = null;
        this.showStaticNextText = false;
        this._countdownStartMs = null;
        this.itemType = null;
    }
}

export default UpNextDialog;
