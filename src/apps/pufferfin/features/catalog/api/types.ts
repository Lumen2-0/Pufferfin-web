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
