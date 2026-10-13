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

export interface SettingsModel {
    quality?: ChoiceSetting
    speed?: { current: number, rates: number[], select: (rate: number) => void }
    aspectRatio?: ChoiceSetting
    /** Opens the subtitle offset, when the subtitles shown allow it. */
    subtitleOffset?: () => void
    /** Shows the playback data over the picture. */
    stats?: () => void
    autoNext?: SwitchSetting
    autoSkipIntro?: SwitchSetting
    locale?: string
}

type SettingsView = 'main' | 'quality' | 'speed' | 'aspectRatio';

function renderRow(label: string, value: string | undefined, onClick: () => void): HTMLElement {
    const row = el('button', 'pf-osd-row');
    row.type = 'button';
    row.setAttribute('role', 'menuitem');
    row.append(el('span', 'pf-osd-row__label', label));
    const aside = el('span', 'pf-osd-row__value');
    if (value) aside.append(document.createTextNode(value));
    aside.insertAdjacentHTML('beforeend', ICONS.chevronRight);
    row.append(aside);
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

type Go = (view: SettingsView) => void;

/** The first view: a row per setting with its value, then the switches. */
function renderMainView(list: HTMLElement, model: SettingsModel, go: Go) {
    list.append(renderHeading(playerText('Player.Settings')));
    if (model.quality) list.append(renderRow(playerText('Player.Quality'), model.quality.value, () => go('quality')));
    if (model.speed) list.append(renderRow(playerText('Player.Speed'), formatPlaybackRate(model.speed.current, model.locale), () => go('speed')));
    if (model.aspectRatio) list.append(renderRow(playerText('Player.AspectRatio'), model.aspectRatio.value, () => go('aspectRatio')));
    if (model.subtitleOffset) list.append(renderRow(playerText('Player.SubtitleOffset'), undefined, model.subtitleOffset));
    if (model.stats) list.append(renderRow(playerText('Player.Stats'), undefined, model.stats));

    const switches: HTMLElement[] = [];
    if (model.autoNext) switches.push(renderSwitch(playerText('Player.AutoNext'), model.autoNext));
    if (model.autoSkipIntro) switches.push(renderSwitch(playerText('Player.AutoSkipIntro'), model.autoSkipIntro));
    if (switches.length && list.childElementCount > 1) list.append(el('div', 'pf-osd-separator'));
    list.append(...switches);
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

/** The values of the quality or of the aspect ratio. */
function renderChoiceView(list: HTMLElement, setting: ChoiceSetting | undefined, title: string, go: Go) {
    if (!setting) return;
    const select = (option: PanelOption) => {
        option.onSelect();
        setting.value = option.label;
        setting.options.forEach(other => {
            other.selected = other === option;
        });
        go('main');
    };
    list.append(
        renderSubHeader(title, () => go('main')),
        renderOptionList(setting.options.map(option => ({ ...option, onSelect: () => select(option) })), title)
    );
}

/**
 * The settings of the player: quality, speed and aspect ratio open their list
 * in the same panel, with a way back; the switches act at once.
 */
export function renderSettingsPanel(panel: HTMLElement, model: SettingsModel) {
    const show = (view: SettingsView) => {
        // A choice that opens a list, or leaves it, takes the focus along
        const keepFocus = panel.contains(document.activeElement);
        const list = el('div', 'pf-osd-settings');
        list.setAttribute('role', 'menu');

        if (view === 'main') renderMainView(list, model, show);
        else if (view === 'speed') renderSpeedView(list, model, show);
        else if (view === 'quality') renderChoiceView(list, model.quality, playerText('Player.Quality'), show);
        else renderChoiceView(list, model.aspectRatio, playerText('Player.AspectRatio'), show);

        panel.classList.toggle('pf-osd-panel--sub', view !== 'main');
        setChildren(panel, list);
        if (keepFocus) {
            const target = list.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]') ?? list.querySelector<HTMLElement>('button');
            target?.focus();
        }
    };

    show('main');
}
