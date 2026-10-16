import { getSubtitleAppearanceSettings, setSubtitleAppearanceSettings } from 'scripts/settings/userSettings';

/** Fired on the window when the user moves the subtitles, or puts them back. */
export const SUBTITLE_MOVED_EVENT = 'pf-subtitle-moved';

const KEY = 'pf-subtitle-positions';

type Positions = Record<string, [ x: number, y: number ]>;

function load(): Positions {
    try {
        return JSON.parse(localStorage.getItem(KEY) || '{}') as Positions;
    } catch {
        return {};
    }
}

/** Keeps the position now set (percent of the screen) for a title: a series shares one for its episodes. */
export function saveSubtitlePosition(titleId: string) {
    const { dragX, dragY } = getSubtitleAppearanceSettings() as Record<string, string | number | undefined>;
    const positions = load();
    positions[titleId] = [ parseFloat(String(dragX)) || 0, parseFloat(String(dragY)) || 0 ];
    try {
        localStorage.setItem(KEY, JSON.stringify(positions));
    } catch {
        // Storage full or blocked: the position still holds for this session
    }
}

/** Puts back the position kept for a title; a title never moved keeps the one in use. */
export function restoreSubtitlePosition(titleId: string) {
    const position = load()[titleId];
    if (!position) return;
    setSubtitleAppearanceSettings({ ...getSubtitleAppearanceSettings(), dragX: position[0], dragY: position[1] }, undefined);
}
