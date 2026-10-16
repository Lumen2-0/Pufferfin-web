import { ICONS } from './icons';
import { formatPlaybackRate } from './model';
import { renderHeading, renderOptionList, type PanelOption } from './options';
import { el, setChildren } from './panelHost';
import { playerText } from './strings';

/** A setting with a list of values: its current value and the values to choose from. */
export interface ChoiceSetting {
    /** The current value, as written on the right of its row. */
    value: string
    options: PanelOption[]
}

/** A switch of the settings. */
export interface SwitchSetting {
    checked: boolean
    set: (checked: boolean) => void
}

/** A value moved one step at a time: `step` applies the move and gives the value to show. */
export interface StepSetting {
    value: string
    step: (direction: 1 | -1) => string
}

/** The look of the subtitles, a list of choices per trait, and the way to put them back. */
export interface SubtitleSettings {
    /** The first choice is shown on the row of the settings. */
    choices: Array<{ key: string, label: string, setting: ChoiceSetting }>
    height: StepSetting
    /** Styles an element the way the subtitles are now, to preview them. */
    preview: (element: HTMLElement) => void
    /** Puts the subtitles back at the bottom of the screen. */
    recenter: () => void
    /** Opens the subtitle offset, when the subtitles shown allow it. */
    offset?: () => void
    /** Puts the default look back and gives the settings it left. */
    reset: () => SubtitleSettings
}

export interface SettingsModel {
    quality?: ChoiceSetting
    audio?: ChoiceSetting
    audioDelay?: ChoiceSetting
    nightMode?: SwitchSetting
    brightness?: ChoiceSetting
    contrast?: ChoiceSetting
    subtitleTrack?: ChoiceSetting
    speed?: { current: number, rates: number[], select: (rate: number) => void }
    aspectRatio?: ChoiceSetting
    ambilight?: ChoiceSetting
    ambilightSize?: ChoiceSetting
    subtitles?: SubtitleSettings
    /** Shows the playback data over the picture. */
    stats?: () => void
    autoNext?: SwitchSetting
    autoSkipIntro?: SwitchSetting
    autoSkipExtras?: SwitchSetting
    rememberLanguage?: SwitchSetting
    locale?: string
}

function renderRow(label: string, value: string | undefined, onClick: () => void): HTMLElement {
    const row = el('button', 'pf-osd-row');
    row.type = 'button';
    row.setAttribute('role', 'menuitem');
    row.append(el('span', 'pf-osd-row__label', label));
    const aside = el('span', 'pf-osd-row__value');
    if (value) aside.append(el('span', 'pf-osd-row__text', value));
    aside.insertAdjacentHTML('beforeend', ICONS.chevronRight);
    row.append(aside);
    row.addEventListener('click', onClick);
    return row;
}

/** A row that acts at once: no value, no chevron. */
function renderAction(label: string, onClick: () => void): HTMLElement {
    const row = el('button', 'pf-osd-row');
    row.type = 'button';
    row.setAttribute('role', 'menuitem');
    row.append(el('span', 'pf-osd-row__label', label));
    row.addEventListener('click', onClick);
    return row;
}

function renderSwitch(label: string, setting: SwitchSetting): HTMLElement {
    const row = el('button', 'pf-osd-row pf-osd-row--switch');
    row.type = 'button';
    row.setAttribute('role', 'menuitemcheckbox');
    row.setAttribute('aria-checked', String(setting.checked));
    row.append(el('span', 'pf-osd-row__label', label), el('span', 'pf-osd-switch'));
    row.addEventListener('click', () => {
        setting.checked = !setting.checked;
        row.setAttribute('aria-checked', String(setting.checked));
        setting.set(setting.checked);
    });
    return row;
}

function renderSubHeader(title: string, onBack: () => void): HTMLElement {
    const header = el('div', 'pf-osd-subheader');
    const back = el('button', 'pf-osd-iconbutton pf-osd-iconbutton--small');
    back.type = 'button';
    back.setAttribute('aria-label', playerText('Player.BackToSettings'));
    back.innerHTML = ICONS.chevronLeft;
    back.addEventListener('click', onBack);
    header.append(back, el('div', 'pf-osd-subheader__title', title));
    return header;
}

/** A group of rows under its heading, a hairline above it when it is not the first. */
function startGroup(list: HTMLElement, title: string) {
    if (list.childElementCount) list.append(el('div', 'pf-osd-separator'));
    list.append(renderHeading(title));
}

type Go = (view: string) => void;

/** The playback group: quality, speed and the data over the picture. */
function renderPlaybackGroup(list: HTMLElement, model: SettingsModel, go: Go) {
    if (!model.quality && !model.speed && !model.stats) return;
    startGroup(list, playerText('Player.GroupPlayback'));
    if (model.quality) list.append(renderRow(playerText('Player.Quality'), model.quality.value, () => go('quality')));
    if (model.speed) list.append(renderRow(playerText('Player.Speed'), formatPlaybackRate(model.speed.current, model.locale), () => go('speed')));
    if (model.stats) list.append(renderRow(playerText('Player.Stats'), undefined, model.stats));
}

/** The sound group: the audio track, its delay and the night mode. */
function renderSoundGroup(list: HTMLElement, model: SettingsModel, go: Go) {
    if (!model.audio && !model.audioDelay && !model.nightMode) return;
    startGroup(list, playerText('Player.GroupSound'));
    if (model.audio) list.append(renderRow(playerText('Player.Audio'), model.audio.value, () => go('audio')));
    if (model.audioDelay) list.append(renderRow(playerText('Player.AudioDelay'), model.audioDelay.value, () => go('audioDelay')));
    if (model.nightMode) list.append(renderSwitch(playerText('Player.NightMode'), model.nightMode));
}

/** The picture group: the aspect ratio and the ambilight. */
function renderPictureGroup(list: HTMLElement, model: SettingsModel, go: Go) {
    if (!model.aspectRatio && !model.ambilight && !model.brightness) return;
    startGroup(list, playerText('Player.GroupPicture'));
    if (model.aspectRatio) list.append(renderRow(playerText('Player.AspectRatio'), model.aspectRatio.value, () => go('aspectRatio')));
    if (model.brightness) list.append(renderRow(playerText('Player.Brightness'), model.brightness.value, () => go('brightness')));
    if (model.contrast) list.append(renderRow(playerText('Player.Contrast'), model.contrast.value, () => go('contrast')));
    if (model.ambilight) list.append(renderRow(playerText('Player.Ambilight'), model.ambilight.value, () => go('ambilight')));
    if (model.ambilight && model.ambilightSize) list.append(renderRow(playerText('Player.AmbilightSize'), model.ambilightSize.value, () => go('ambilightSize')));
}

/** The first view: the settings in groups, a row per setting with its value, then the switches. */
function renderMainView(list: HTMLElement, model: SettingsModel, go: Go) {
    list.append(renderHeading(playerText('Player.Settings')));
    renderPlaybackGroup(list, model, go);
    renderSoundGroup(list, model, go);
    renderPictureGroup(list, model, go);

    if (model.subtitles) {
        startGroup(list, playerText('Player.Subtitles'));
        if (model.subtitleTrack) list.append(renderRow(playerText('Player.SubtitleTrack'), model.subtitleTrack.value, () => go('subtitleTrack')));
        list.append(renderRow(playerText('Player.SubtitleAppearance'), undefined, () => go('subtitles')));
    }

    if (model.autoNext || model.autoSkipIntro || model.autoSkipExtras || model.rememberLanguage) {
        startGroup(list, playerText('Player.GroupAutomatic'));
        if (model.autoNext) list.append(renderSwitch(playerText('Player.AutoNext'), model.autoNext));
        if (model.autoSkipIntro) list.append(renderSwitch(playerText('Player.AutoSkipIntro'), model.autoSkipIntro));
        if (model.autoSkipExtras) list.append(renderSwitch(playerText('Player.AutoSkipExtras'), model.autoSkipExtras));
        if (model.rememberLanguage) list.append(renderSwitch(playerText('Player.RememberLanguage'), model.rememberLanguage));
    }
}

/** The speeds, the normal one named so. */
function renderSpeedView(list: HTMLElement, model: SettingsModel, go: Go) {
    const speed = model.speed;
    if (!speed) return;
    const speedName = (rate: number) => {
        const text = formatPlaybackRate(rate, model.locale);
        return rate === 1 ? playerText('Player.SpeedNormal', text) : text;
    };
    const select = (rate: number) => {
        speed.select(rate);
        speed.current = rate;
        go('main');
    };
    list.append(
        renderSubHeader(playerText('Player.Speed'), () => go('main')),
        renderOptionList(speed.rates.map(rate => ({
            label: speedName(rate),
            selected: rate === speed.current,
            onSelect: () => select(rate)
        })), playerText('Player.Speed'))
    );
}

/** The values of a setting: the quality, the aspect ratio, a trait of the subtitles. */
function renderChoiceView(list: HTMLElement, setting: ChoiceSetting | undefined, title: string, back: string, go: Go) {
    if (!setting) return;
    const select = (option: PanelOption) => {
        option.onSelect();
        setting.value = option.label;
        setting.options.forEach(other => {
            other.selected = other === option;
        });
        go(back);
    };
    list.append(
        renderSubHeader(title, () => go(back)),
        renderOptionList(setting.options.map(option => ({ ...option, onSelect: () => select(option) })), title)
    );
}

/** A line of sample text, drawn the way the subtitles are drawn on the picture. */
function renderPreview(subtitles: SubtitleSettings): HTMLElement {
    const box = el('div', 'pf-osd-subpreview');
    box.setAttribute('aria-hidden', 'true');
    const text = el('span', 'pf-osd-subpreview__text', playerText('Player.SubtitlePreview'));
    subtitles.preview(text);
    box.append(text);
    return box;
}

/** The look of the subtitles: a preview, a row per trait, the offset and the way back to the defaults. */
function renderSubtitlesView(list: HTMLElement, subtitles: SubtitleSettings, go: Go, reset: () => void) {
    list.append(
        renderSubHeader(playerText('Player.SubtitleAppearance'), () => go('main')),
        renderPreview(subtitles)
    );
    for (const choice of subtitles.choices) list.append(renderRow(choice.label, choice.setting.value, () => go(choice.key)));
    list.append(renderRow(playerText('Player.SubtitleHeight'), subtitles.height.value, () => go('height')));
    list.append(renderAction(playerText('Player.SubtitleRecenter'), subtitles.recenter));
    if (subtitles.offset) list.append(renderRow(playerText('Player.SubtitleOffset'), undefined, subtitles.offset));
    list.append(el('div', 'pf-osd-separator'), renderAction(playerText('Player.SubtitleReset'), reset));
}

/** Moves the subtitles up and down, the preview above to see the result. */
function renderHeightView(list: HTMLElement, subtitles: SubtitleSettings, go: Go, refresh: () => void) {
    const move = (direction: 1 | -1) => () => {
        subtitles.height.value = subtitles.height.step(direction);
        refresh();
    };
    list.append(
        renderSubHeader(playerText('Player.SubtitleHeight'), () => go('subtitles')),
        renderPreview(subtitles),
        renderAction(playerText('Player.SubtitleHigher'), move(-1)),
        renderAction(playerText('Player.SubtitleLower'), move(1)),
        el('div', 'pf-osd-heading pf-osd-heading--value', subtitles.height.value)
    );
}

/** Draws one view of the settings into the list. */
function renderView(list: HTMLElement, view: string, model: SettingsModel, show: Go) {
    const subtitles = model.subtitles;
    const choices: Record<string, [ ChoiceSetting | undefined, string ]> = {
        quality: [ model.quality, playerText('Player.Quality') ],
        audio: [ model.audio, playerText('Player.Audio') ],
        audioDelay: [ model.audioDelay, playerText('Player.AudioDelay') ],
        brightness: [ model.brightness, playerText('Player.Brightness') ],
        contrast: [ model.contrast, playerText('Player.Contrast') ],
        subtitleTrack: [ model.subtitleTrack, playerText('Player.SubtitleTrack') ],
        ambilight: [ model.ambilight, playerText('Player.Ambilight') ],
        ambilightSize: [ model.ambilightSize, playerText('Player.AmbilightSize') ],
        aspectRatio: [ model.aspectRatio, playerText('Player.AspectRatio') ]
    };
    const subtitleChoice = subtitles?.choices.find(item => item.key === view);
    const resetSubtitles = () => {
        if (!subtitles) return;
        model.subtitles = subtitles.reset();
        show('subtitles');
    };

    if (view === 'speed') {
        renderSpeedView(list, model, show);
    } else if (choices[view]) {
        renderChoiceView(list, choices[view][0], choices[view][1], 'main', show);
    } else if (subtitles && view === 'subtitles') {
        renderSubtitlesView(list, subtitles, show, resetSubtitles);
    } else if (subtitles && view === 'height') {
        renderHeightView(list, subtitles, show, () => show('height'));
    } else if (subtitleChoice) {
        renderChoiceView(list, subtitleChoice.setting, subtitleChoice.label, 'subtitles', show);
    } else {
        renderMainView(list, model, show);
    }
}

/**
 * The settings of the player, in groups: quality, speed, aspect ratio and the
 * look of the subtitles open their list in the same panel, with a way back;
 * the switches act at once.
 */
export function renderSettingsPanel(panel: HTMLElement, model: SettingsModel) {
    let shown: string | undefined;

    const show = (view: string) => {
        // A choice that opens a list, or leaves it, takes the focus along
        const keepFocus = panel.contains(document.activeElement);
        const focusedIndex = Array.from(panel.querySelectorAll('button')).indexOf(document.activeElement as HTMLButtonElement);
        const list = el('div', 'pf-osd-settings');
        list.setAttribute('role', 'menu');
        renderView(list, view, model, show);

        panel.classList.toggle('pf-osd-panel--sub', view !== 'main');
        setChildren(panel, list);
        if (keepFocus) {
            // The same view drawn again (a step) keeps the focus on the same button
            const buttons = Array.from(list.querySelectorAll<HTMLElement>('button'));
            const checked = list.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]');
            const sameButton = view === shown && focusedIndex >= 0 ? buttons[focusedIndex] : undefined;
            (sameButton ?? checked ?? buttons[0])?.focus();
        }
        shown = view;
    };

    show('main');
}
