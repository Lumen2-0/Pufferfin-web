import { get, set } from 'scripts/settings/userSettings';

import type { ChoiceSetting, SwitchSetting } from './osd/settingsPanel';

const AUDIO_DELAY_KEY = 'pf-audio-delay';
const NIGHT_MODE_KEY = 'pf-night-mode';
const BRIGHTNESS_KEY = 'pf-brightness';
const CONTRAST_KEY = 'pf-contrast';

const DELAYS = [ 0, 50, 100, 150, 200, 300, 400, 500, 750, 1000, 1500, 2000 ];
const LEVELS = [ 70, 80, 90, 100, 110, 120, 130 ];

const readNumber = (key: string, fallback: number) => {
    const value = Number(get(key, false));
    return get(key, false) && !Number.isNaN(value) ? value : fallback;
};

interface AudioGraph {
    context: AudioContext
    delay: DelayNode
    compressor: DynamicsCompressorNode
    makeup: GainNode
}

// A media element can be wired into the Web Audio graph once only
const graphs = new WeakMap<HTMLMediaElement, AudioGraph>();

function getGraph(video: HTMLMediaElement): AudioGraph | undefined {
    const known = graphs.get(video);
    if (known) return known;
    try {
        // eslint-disable-next-line compat/compat
        const context = new AudioContext();
        const delay = context.createDelay(2);
        const compressor = context.createDynamicsCompressor();
        const makeup = context.createGain();
        context.createMediaElementSource(video).connect(delay);
        delay.connect(compressor);
        compressor.connect(makeup);
        makeup.connect(context.destination);
        const graph = { context, delay, compressor, makeup };
        graphs.set(video, graph);
        return graph;
    } catch (error) {
        console.warn('[player] the audio effects are not available', error);
        return undefined;
    }
}

/**
 * Puts the saved picture and sound effects on the video: brightness and
 * contrast as a CSS filter, the audio delay and the night mode through Web
 * Audio. The audio path is left alone until one of them is asked for.
 */
export function applyPlayerEffects(video: HTMLMediaElement) {
    const brightness = readNumber(BRIGHTNESS_KEY, 100);
    const contrast = readNumber(CONTRAST_KEY, 100);
    video.style.filter = brightness === 100 && contrast === 100 ? '' : `brightness(${brightness}%) contrast(${contrast}%)`;

    const delay = readNumber(AUDIO_DELAY_KEY, 0);
    const night = get(NIGHT_MODE_KEY, false) === 'true';
    if (!delay && !night && !graphs.has(video)) return;

    const graph = getGraph(video);
    if (!graph) return;
    graph.delay.delayTime.value = delay / 1000;
    // The night mode lifts the quiet dialogues and holds back the loud scenes
    graph.compressor.threshold.value = night ? -50 : 0;
    graph.compressor.knee.value = night ? 40 : 0;
    graph.compressor.ratio.value = night ? 12 : 1;
    graph.compressor.attack.value = night ? 0 : 0.003;
    graph.compressor.release.value = 0.25;
    graph.makeup.gain.value = night ? 1.6 : 1;
    void graph.context.resume();
}

function getLevelSetting(key: string, levels: number[], apply: () => void): ChoiceSetting {
    const current = readNumber(key, 100);
    const options = levels.map(level => ({
        label: `${level} %`,
        selected: level === current,
        onSelect: () => {
            set(key, level, false);
            apply();
        }
    }));
    return { value: `${current} %`, options };
}

/** The sound and picture effects as settings of the panel; `apply` puts them on the video. */
export function getEffectSettings(apply: () => void, canDelayAudio: boolean) {
    const night: SwitchSetting = {
        checked: get(NIGHT_MODE_KEY, false) === 'true',
        set: checked => {
            set(NIGHT_MODE_KEY, checked, false);
            apply();
        }
    };
    const delay = readNumber(AUDIO_DELAY_KEY, 0);
    const audioDelay: ChoiceSetting = {
        value: `${delay} ms`,
        options: DELAYS.map(ms => ({
            label: `${ms} ms`,
            selected: ms === delay,
            onSelect: () => {
                set(AUDIO_DELAY_KEY, ms, false);
                apply();
            }
        }))
    };
    return {
        nightMode: canDelayAudio ? night : undefined,
        audioDelay: canDelayAudio ? audioDelay : undefined,
        brightness: getLevelSetting(BRIGHTNESS_KEY, LEVELS, apply),
        contrast: getLevelSetting(CONTRAST_KEY, LEVELS, apply)
    };
}
