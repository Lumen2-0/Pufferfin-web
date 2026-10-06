// Types of the Pufferfin requests API (`Pufferfin/Requests`). They are not part of the generated Jellyfin SDK.

/** What a request asks for. */
export enum RequestKind {
    Movie = 'Movie',
    Season = 'Season',
    Episode = 'Episode'
}

/** Where a request stands. The usual path is Queued, Searching, Downloading, Importing, Available. */
export enum RequestState {
    PendingApproval = 'PendingApproval',
    Queued = 'Queued',
    Searching = 'Searching',
    WaitingForSources = 'WaitingForSources',
    Downloading = 'Downloading',
    Importing = 'Importing',
    Available = 'Available',
    Failed = 'Failed',
    Cancelled = 'Cancelled',
    Rejected = 'Rejected'
}

/** Why a request failed or waits. The client translates the code. */
export enum RequestProblemCode {
    ServiceDisabled = 'ServiceDisabled',
    ServiceUnavailable = 'ServiceUnavailable',
    TitleUnknown = 'TitleUnknown',
    TvdbIdMissing = 'TvdbIdMissing',
    NoRootFolder = 'NoRootFolder',
    EpisodeNotFound = 'EpisodeNotFound',
    NoRelease = 'NoRelease',
    IndexersUnavailable = 'IndexersUnavailable',
    NoIndexer = 'NoIndexer',
    OnlySeasonPacks = 'OnlySeasonPacks',
    NoAcceptableLanguage = 'NoAcceptableLanguage',
    DownloadFailed = 'DownloadFailed',
    ImportBlocked = 'ImportBlocked',
    DownloadWarning = 'DownloadWarning'
}

export interface RequestProblem {
    Code: RequestProblemCode;
    /** English sentence written by the server. */
    Message: string;
    /** Reason given by Radarr, Sonarr or qBittorrent, when there is one. */
    Detail?: string | null;
}

/** A download request. Also the payload of the `PufferfinRequestUpdated` WebSocket message. */
export interface MediaRequest {
    Id: string;
    UserId: string;
    Kind: RequestKind;
    TmdbId: number;
    SeasonNumber?: number | null;
    EpisodeNumber?: number | null;
    Title: string;
    /** Requested audio language: an ISO 639-1 code, or `original`. */
    Language: string;
    ChosenLanguage?: string | null;
    ReleaseTitle?: string | null;
    State: RequestState;
    Problem?: RequestProblem | null;
    /** From 0 to 1, while downloading. */
    Progress?: number | null;
    BytesPerSecond?: number | null;
    EtaSeconds?: number | null;
    /** One based place among the requests waiting for a slot. */
    QueuePosition?: number | null;
    CreatedAt: string;
    UpdatedAt: string;
    /** When the server searches again a request waiting for sources. */
    NextAttemptAt?: string | null;
}

export interface CreateMediaRequest {
    Kind: RequestKind;
    TmdbId: number;
    SeasonNumber?: number;
    EpisodeNumber?: number;
    AirDate?: string;
    /** Omitted: the server picks the remembered or preferred language, else the original version. */
    Language?: string;
}

/** What the current user may request. */
export interface RequestPermissions {
    CanRequest: boolean;
    RequiresApproval: boolean;
    WeeklyQuota?: number | null;
    CanDelete: boolean;
    UsedThisWeek: number;
    IsAdministrator: boolean;
}

/** Name of the WebSocket message carrying a changed request. */
export const REQUEST_UPDATED_MESSAGE = 'PufferfinRequestUpdated';
