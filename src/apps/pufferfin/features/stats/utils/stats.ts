const TICKS_PER_MINUTE = 600_000_000;
const TOP_GENRES = 5;
const TITLE_ROW = 12;

/** What the statistics read of a played film or episode. */
export interface PlayedItem {
    Id?: string | null
    Name?: string | null
    SeriesName?: string | null
    Type?: string | null
    RunTimeTicks?: number | null
    SeriesId?: string | null
    Genres?: string[] | null
    UserData?: { LastPlayedDate?: string | null, PlayCount?: number | null } | null
}

export interface GenreStat {
    name: string
    minutes: number
}

/** A film or a whole series, with the time spent on it and when it was last played. */
export interface TitleStat {
    /** Library id of the film or the series, for its poster and its page. */
    id: string
    name: string
    minutes: number
    lastPlayed: number
}

export interface WatchStats {
    topTitles: TitleStat[]
    recent: TitleStat[]
    minutes: number
    movies: number
    episodes: number
    topGenres: GenreStat[]
    /** Month of the year (0 to 11) with the most time watched. */
    busiestMonth: number | undefined
}

const getYear = (item: PlayedItem) => {
    const date = item.UserData?.LastPlayedDate;
    return date ? new Date(date).getFullYear() : undefined;
};

/** Years with something watched, latest first. */
export const getWatchedYears = (items: PlayedItem[]) => [ ...new Set(items.map(getYear).filter((year): year is number => year !== undefined)) ]
    .sort((a, b) => b - a);

const getGenres = (item: PlayedItem, seriesGenres: ReadonlyMap<string, string[]>) => {
    if (item.Genres?.length) return item.Genres;
    return (item.SeriesId && seriesGenres.get(item.SeriesId)) || [];
};

const addTitle = (byTitle: Map<string, TitleStat>, item: PlayedItem, time: number) => {
    const id = item.SeriesId ?? item.Id;
    if (!id) return;
    const lastPlayed = item.UserData?.LastPlayedDate ? Date.parse(item.UserData.LastPlayedDate) : 0;
    const known = byTitle.get(id);
    if (known) {
        known.minutes += time;
        known.lastPlayed = Math.max(known.lastPlayed, lastPlayed);
    } else {
        byTitle.set(id, { id, name: (item.SeriesName ?? item.Name) || '', minutes: time, lastPlayed });
    }
};

/**
 * Time watched, from the runtime of what was played. The library keeps the
 * date of the last play only: a year counts each title once, the whole
 * history counts every play. Episodes take the genres of their series.
 */
export function computeStats(items: PlayedItem[], seriesGenres: ReadonlyMap<string, string[]>, year?: number): WatchStats {
    const byGenre = new Map<string, number>();
    const byMonth = new Array<number>(12).fill(0);
    const byTitle = new Map<string, TitleStat>();
    let minutes = 0;
    let movies = 0;
    let episodes = 0;

    for (const item of items.filter(played => year === undefined || getYear(played) === year)) {
        const plays = year === undefined ? Math.max(1, item.UserData?.PlayCount ?? 1) : 1;
        const time = ((item.RunTimeTicks ?? 0) / TICKS_PER_MINUTE) * plays;
        minutes += time;
        if (item.Type === 'Movie') movies += plays;
        else episodes += plays;

        const lastPlayed = item.UserData?.LastPlayedDate;
        if (lastPlayed) byMonth[new Date(lastPlayed).getMonth()] += time;
        addTitle(byTitle, item, time);
        for (const genre of getGenres(item, seriesGenres)) byGenre.set(genre, (byGenre.get(genre) ?? 0) + time);
    }

    const topGenres = [ ...byGenre ]
        .map(([ name, genreMinutes ]) => ({ name, minutes: Math.round(genreMinutes) }))
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, TOP_GENRES);
    const titles = [ ...byTitle.values() ];
    const peak = Math.max(...byMonth);

    return {
        topTitles: [ ...titles ].sort((a, b) => b.minutes - a.minutes).slice(0, TITLE_ROW),
        recent: [ ...titles ].sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, TITLE_ROW),
        minutes: Math.round(minutes),
        movies,
        episodes,
        topGenres,
        busiestMonth: peak > 0 ? byMonth.indexOf(peak) : undefined
    };
}

/** Whole hours and the minutes left, for "12 h 05". */
export const splitMinutes = (minutes: number) => ({ hours: Math.floor(minutes / 60), minutes: minutes % 60 });
