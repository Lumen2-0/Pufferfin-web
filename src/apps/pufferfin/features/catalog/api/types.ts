// Types of the Pufferfin catalog API (`Pufferfin.Catalog`). They are not part of the generated Jellyfin SDK.

/** The kind of a catalog entry. */
export enum CatalogItemKind {
    Movie = 'Movie',
    Series = 'Series',
    Person = 'Person',
    Audiobook = 'Audiobook'
}

/** Whether a catalog entry is in the local library. */
export enum CatalogAvailability {
    Missing = 'Missing',
    OnDisk = 'OnDisk'
}

/** The outcome of a query against one catalog source. */
export enum CatalogSourceStatus {
    Ok = 'Ok',
    Disabled = 'Disabled',
    Unavailable = 'Unavailable',
    Unauthorized = 'Unauthorized',
    RateLimited = 'RateLimited',
    TimedOut = 'TimedOut'
}

export interface CatalogSourceReport {
    Source: string;
    Status: CatalogSourceStatus;
}

/** One entry of the unified catalog: a title or a person, on disk or not. */
export interface CatalogItem {
    /** Stable key, such as `tmdb:movie:603` or `library:{item id}`. */
    Key: string;
    Kind: CatalogItemKind;
    Title: string;
    OriginalTitle?: string | null;
    Year?: number | null;
    Overview?: string | null;
    /** Absolute URL of a remote poster. Empty for a local only entry. */
    ImageUrl?: string | null;
    BackdropUrl?: string | null;
    Availability: CatalogAvailability;
    /** Id of the library item, when the entry is on disk. */
    LocalItemId?: string | null;
    TmdbId?: number | null;
}

export interface CatalogListResponse {
    Items: CatalogItem[];
    Sources: CatalogSourceReport[];
}

export interface CatalogGenre {
    Id: number;
    Name: string;
}

export interface CatalogCountry {
    Code: string;
    Name?: string | null;
}

/** The sheet of a film or a series, from TMDB. */
export interface CatalogTitleDetails {
    Kind: CatalogItemKind;
    TmdbId: number;
    Title: string;
    OriginalTitle?: string | null;
    Overview?: string | null;
    Tagline?: string | null;
    Year?: number | null;
    RuntimeMinutes?: number | null;
    NumberOfSeasons?: number | null;
    PosterUrl?: string | null;
    BackdropUrl?: string | null;
    Genres: CatalogGenre[];
    Countries: CatalogCountry[];
    Recommendations: CatalogItem[];
    Availability: CatalogAvailability;
    LocalItemId?: string | null;
}

/** A source that knows a catalog entry. `Library` alone marks an entry on disk that TMDB does not list. */
export enum CatalogSource {
    Library = 'Library',
    Tmdb = 'Tmdb',
    Audible = 'Audible',
    Letterboxd = 'Letterboxd'
}

/** A season of a series, TMDB merged with the local library. */
export interface CatalogSeason {
    /** 0 for specials. */
    SeasonNumber: number;
    Name?: string | null;
    Overview?: string | null;
    /** Episodes announced by TMDB, null for a season TMDB does not know. */
    EpisodeCount?: number | null;
    /** Distinct episodes on disk. */
    LocalEpisodeCount: number;
    AirDate?: string | null;
    PosterUrl?: string | null;
    Availability: CatalogAvailability;
    /** Library item of the season, when its folder exists. */
    LocalItemId?: string | null;
    Sources: CatalogSource[];
}

/** The seasons of a series, specials first, one entry per number. */
export interface CatalogSeriesSeasons {
    TmdbId: number;
    Availability: CatalogAvailability;
    LocalItemId?: string | null;
    Seasons: CatalogSeason[];
}

/** An episode, TMDB merged with the local library: one entry, never a duplicate. */
export interface CatalogEpisode {
    SeasonNumber: number;
    /** Null for a file on disk the library could not number. */
    EpisodeNumber?: number | null;
    /** Last number of a file on disk holding several episodes that TMDB does not list. */
    EpisodeNumberEnd?: number | null;
    Title?: string | null;
    Overview?: string | null;
    AirDate?: string | null;
    StillUrl?: string | null;
    RuntimeMinutes?: number | null;
    Availability: CatalogAvailability;
    /** Library item, when on disk. Two episodes held by one file share it. */
    LocalItemId?: string | null;
    Sources: CatalogSource[];
}

/** A season with its episodes, by number, episodes without a number last. */
export interface CatalogSeasonDetails {
    SeriesTmdbId: number;
    SeasonNumber: number;
    Name?: string | null;
    Overview?: string | null;
    AirDate?: string | null;
    PosterUrl?: string | null;
    Availability: CatalogAvailability;
    LocalItemId?: string | null;
    Sources: CatalogSource[];
    Episodes: CatalogEpisode[];
}
