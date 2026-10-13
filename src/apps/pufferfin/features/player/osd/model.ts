/**
 * Pure logic of the video player controls: times, chapters, the states of
 * the episodes in the Episodes drawer and the names of the speeds. No DOM,
 * no player: the controller and the panels feed it plain values.
 */

const TICKS_PER_SECOND = 10_000_000;
const TICKS_PER_MINUTE = 60 * TICKS_PER_SECOND;

/** A chapter as the server gives it. */
export interface ChapterInfo {
    Name?: string | null
    StartPositionTicks?: number | null
}

/** A chapter notch on the timeline: where it starts, from 0 to 1. */
export interface ChapterMarker {
    name: string
    progress: number
}

/** A running time: "0:05", "23:59", "1:02:03". Negative or missing reads 0:00. */
export function formatRunningTime(ticks: number | null | undefined): string {
    const totalSeconds = Math.max(0, Math.floor((ticks ?? 0) / TICKS_PER_SECOND));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value: number) => String(value).padStart(2, '0');
    return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Whole minutes left, rounded up so that the last seconds still read one minute. */
export function getMinutesLeft(runtimeTicks: number | null | undefined, positionTicks: number | null | undefined): number {
    const left = (runtimeTicks ?? 0) - (positionTicks ?? 0);
    return left > 0 ? Math.ceil(left / TICKS_PER_MINUTE) : 0;
}

/** A length in minutes, whole minutes rounded to the nearest, at least one when there is any. */
export function getMinutes(ticks: number | null | undefined): number {
    if (!ticks || ticks <= 0) return 0;
    return Math.max(1, Math.round(ticks / TICKS_PER_MINUTE));
}

/** Percent watched, from 0 to 100, kept inside the bar. */
export function getProgressPercent(positionTicks: number | null | undefined, runtimeTicks: number | null | undefined): number {
    if (!runtimeTicks || runtimeTicks <= 0 || !positionTicks) return 0;
    return Math.min(100, Math.max(0, (positionTicks / runtimeTicks) * 100));
}

/**
 * The chapter notches of the timeline. The first chapter starts the video and
 * gets no notch, nor does a chapter past the end.
 */
export function getChapterMarkers(chapters: ChapterInfo[] | null | undefined, runtimeTicks: number | null | undefined): ChapterMarker[] {
    if (!chapters?.length || !runtimeTicks || runtimeTicks <= 0) return [];
    return chapters
        .filter(chapter => (chapter.StartPositionTicks ?? 0) > 0 && (chapter.StartPositionTicks ?? 0) < runtimeTicks)
        .map(chapter => ({
            name: chapter.Name ?? '',
            progress: (chapter.StartPositionTicks ?? 0) / runtimeTicks
        }));
}

/** The chapter a position falls in, with its index; none before the first one. */
export function getChapterAt(chapters: ChapterInfo[] | null | undefined, positionTicks: number): { chapter: ChapterInfo, index: number } | undefined {
    let found: { chapter: ChapterInfo, index: number } | undefined;
    (chapters ?? []).forEach((chapter, index) => {
        if (positionTicks >= (chapter.StartPositionTicks ?? 0)) found = { chapter, index };
    });
    return found;
}

/** An episode as the Episodes drawer reads it. */
export interface EpisodeInfo {
    Id?: string | null
    RunTimeTicks?: number | null
    UserData?: {
        Played?: boolean | null
        PlaybackPositionTicks?: number | null
    } | null
}

export type EpisodeStateKind = 'current' | 'inProgress' | 'played' | 'unplayed';

/** What a row of the Episodes drawer tells about an episode. */
export interface EpisodeState {
    kind: EpisodeStateKind
    /** Percent watched, for the bar on the picture; 0 hides it. */
    progress: number
    /** Minutes left to watch, for the current episode and one started. */
    minutesLeft: number
    /** Minutes it lasts, for one not started. */
    minutes: number
}

/**
 * The state of an episode in the drawer. The one playing reads its live
 * position; another one started and not finished is in progress; then watched,
 * else not watched yet.
 */
export function getEpisodeState(episode: EpisodeInfo, currentId?: string | null, currentPositionTicks?: number | null): EpisodeState {
    const runtime = episode.RunTimeTicks ?? 0;
    const minutes = getMinutes(runtime);

    if (currentId && episode.Id === currentId) {
        const position = currentPositionTicks ?? episode.UserData?.PlaybackPositionTicks ?? 0;
        return { kind: 'current', progress: getProgressPercent(position, runtime), minutesLeft: getMinutesLeft(runtime, position), minutes };
    }

    const position = episode.UserData?.PlaybackPositionTicks ?? 0;
    if (position > 0 && !episode.UserData?.Played) {
        return { kind: 'inProgress', progress: getProgressPercent(position, runtime), minutesLeft: getMinutesLeft(runtime, position), minutes };
    }

    if (episode.UserData?.Played) return { kind: 'played', progress: 0, minutesLeft: 0, minutes };

    return { kind: 'unplayed', progress: 0, minutesLeft: 0, minutes };
}

/** A playback speed as a person writes it: "1×", "1,25×" in French, "1.25×" in English. */
export function formatPlaybackRate(rate: number, locale?: string): string {
    let number: string;
    try {
        number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(rate);
    } catch {
        number = String(rate);
    }
    return `${number}×`;
}
