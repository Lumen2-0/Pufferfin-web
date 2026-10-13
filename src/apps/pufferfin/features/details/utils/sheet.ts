import type { MediaSourceInfo } from '@jellyfin/sdk/lib/generated-client/models/media-source-info';
import type { MediaStream } from '@jellyfin/sdk/lib/generated-client/models/media-stream';

const TICKS_PER_SECOND = 10_000_000;
const TICKS_PER_MINUTE = 60 * TICKS_PER_SECOND;

/** A playback position as a clock: "31:12", or "1:02:03" past an hour. */
export function formatClock(ticks: number): string {
    const total = Math.max(0, Math.floor(ticks / TICKS_PER_SECOND));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const pad = (value: number) => String(value).padStart(2, '0');
    return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Whole minutes left to watch, at least one, or undefined without a known length. */
export function getRemainingMinutes(runtimeTicks: number | null | undefined, positionTicks: number | null | undefined) {
    if (!runtimeTicks) return undefined;
    const left = runtimeTicks - (positionTicks ?? 0);
    return Math.max(1, Math.round(left / TICKS_PER_MINUTE));
}

/** Minutes as hours and minutes, for the duration strings. */
export function splitMinutes(minutes: number) {
    return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}

/**
 * The episodes shown before "See all": a window of `size` around the current
 * one, with a few watched ones before it and the next ones after. Without a
 * current episode, the first ones.
 */
export function getEpisodeWindow(total: number, currentIndex: number, size = 8, before = 6): { start: number, end: number } {
    if (total <= size) return { start: 0, end: total };
    const wanted = currentIndex < 0 ? 0 : currentIndex - before;
    const start = Math.max(0, Math.min(wanted, total - size));
    return { start, end: start + size };
}

const LANGUAGE_CODES: Record<string, string> = {
    fr: 'FR', fre: 'FR', fra: 'FR',
    en: 'EN', eng: 'EN',
    es: 'ES', spa: 'ES',
    de: 'DE', ger: 'DE', deu: 'DE',
    it: 'IT', ita: 'IT',
    ja: 'JA', jpn: 'JA',
    ko: 'KO', kor: 'KO',
    pt: 'PT', por: 'PT',
    ru: 'RU', rus: 'RU',
    zh: 'ZH', chi: 'ZH', zho: 'ZH',
    nl: 'NL', dut: 'NL', nld: 'NL',
    ar: 'AR', ara: 'AR',
    hi: 'HI', hin: 'HI'
};

/** Two-letter code of a stream language ("fre" gives "FR"), undefined when unknown. */
export function getLanguageCode(language: string | null | undefined): string | undefined {
    if (!language) return undefined;
    const lower = language.toLowerCase().split('-')[0];
    return LANGUAGE_CODES[lower];
}

/** Display order of subtitle languages: French, English, then the rest as they come. */
const SUBTITLE_PRIORITY = [ 'FR', 'EN' ];
const SUBTITLE_LIMIT = 3;

function getResolution(streams: MediaStream[]): string | undefined {
    let width = 0;
    let height = 0;
    for (const stream of streams) {
        if (stream.Type === 'Video') {
            width = Math.max(width, stream.Width ?? 0);
            height = Math.max(height, stream.Height ?? 0);
        }
    }
    // Width first: a scope film in 1080p is 1920 by 800
    if (width >= 3200 || height >= 2000) return '4K';
    if (width >= 1800 || height >= 1000) return '1080p';
    if (width >= 1200 || height >= 700) return '720p';
    return undefined;
}

function getAudioLayout(streams: MediaStream[], stereo: string): string | undefined {
    const channels = Math.max(0, ...streams.filter(stream => stream.Type === 'Audio').map(stream => stream.Channels ?? 0));
    if (channels >= 8) return '7.1';
    if (channels >= 6) return '5.1';
    if (channels >= 2) return stereo;
    return undefined;
}

export interface VersionLabels {
    /** "Stereo" in the language of the interface. */
    stereo: string
    /** "Subtitles FR · EN" from the joined codes. */
    subtitles: (codes: string) => string
}

/**
 * The tags of the versions of a film, readable before playing: resolution,
 * audio layout, VF (a French audio track), VOSTFR (another language with
 * French subtitles), and the subtitle languages.
 */
export function getVersionTags(sources: MediaSourceInfo[] | null | undefined, labels: VersionLabels): string[] {
    const streams = (sources ?? []).flatMap(source => source.MediaStreams ?? []);
    if (!streams.length) return [];

    const audio = streams.filter(stream => stream.Type === 'Audio').map(stream => getLanguageCode(stream.Language));
    const subtitles = Array.from(new Set(
        streams.filter(stream => stream.Type === 'Subtitle')
            .map(stream => getLanguageCode(stream.Language))
            .filter((code): code is string => !!code)
    ));
    subtitles.sort((a, b) => {
        const rank = (code: string) => {
            const index = SUBTITLE_PRIORITY.indexOf(code);
            return index < 0 ? SUBTITLE_PRIORITY.length : index;
        };
        return rank(a) - rank(b);
    });

    const hasFrenchAudio = audio.includes('FR');
    const hasOtherAudio = audio.some(code => !!code && code !== 'FR');

    return [
        getResolution(streams),
        getAudioLayout(streams, labels.stereo),
        hasFrenchAudio ? 'VF' : undefined,
        hasOtherAudio && subtitles.includes('FR') ? 'VOSTFR' : undefined,
        subtitles.length ? labels.subtitles(subtitles.slice(0, SUBTITLE_LIMIT).join(' · ')) : undefined
    ].filter((tag): tag is string => !!tag);
}
