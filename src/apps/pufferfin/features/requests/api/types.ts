// Types of the Pufferfin requests API (`Pufferfin/Requests`). They are not part of the generated Jellyfin SDK.

/** What a request asks for. */
export enum RequestKind {
    Movie = 'Movie',
    Season = 'Season',
    Episode = 'Episode',
    Audiobook = 'Audiobook',
    Ebook = 'Ebook'
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
    DownloadWarning = 'DownloadWarning',
    /** The volume exists only inside a complete edition: a complete edition is never taken for one volume. */
    OnlyCompleteEditions = 'OnlyCompleteEditions',
    FilesNotWritable = 'FilesNotWritable',
    /** The download is stalled: no seed shares it, or the tracker refuses it. It starts on its own when a seed comes back. */
    StalledNoSeeds = 'StalledNoSeeds'
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
    /** Zero for an audiobook. */
    TmdbId: number;
    /** Audible ASIN of an audiobook. */
    Asin?: string | null;
    /** Metadata provider and id of a book to read. */
    BookProvider?: string | null;
    BookId?: string | null;
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
    /** A film downloaded for a while only: it leaves the library seven days after its import. */
    Temporary?: boolean;
    /** When a temporary film leaves the library, once it is available. */
    ExpiresAt?: string | null;
    /** What the expiry of a temporary film did, once it ran. */
    ExpiryOutcome?: TemporaryExpiryOutcome | null;
}

/** What the expiry of a temporary film did. */
export enum TemporaryExpiryOutcome {
    /** The film left the library; a private torrent seeds until its minimum, then goes with its files. */
    Removed = 'Removed',
    /** The film was already gone: nothing was deleted. */
    AlreadyGone = 'AlreadyGone',
    /** Another request wants the film to stay. */
    Kept = 'Kept',
    /** What was found did not match the download: nothing was deleted, an administrator decides. */
    NeedsAttention = 'NeedsAttention'
}

export interface CreateMediaRequest {
    Kind: RequestKind;
    /** Omitted for an audiobook. */
    TmdbId?: number;
    /** Audible ASIN and market of an audiobook. */
    Asin?: string;
    Market?: string;
    /** Metadata provider and id of a book to read. */
    BookProvider?: string;
    BookId?: string;
    SeasonNumber?: number;
    EpisodeNumber?: number;
    AirDate?: string;
    /** Omitted: the server picks the remembered or preferred language, else the original version. */
    Language?: string;
    /** A film downloaded for seven days only, then removed with its torrent. Ignored for anything else. */
    Temporary?: boolean;
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
