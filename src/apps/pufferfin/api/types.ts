// Types of the Pufferfin server API (`Pufferfin.Server`). They are not part of the generated Jellyfin SDK.

/** The external services Pufferfin can drive. */
export enum PufferfinService {
    Radarr = 'Radarr',
    Sonarr = 'Sonarr',
    Prowlarr = 'Prowlarr',
    QBittorrent = 'QBittorrent',
    Bazarr = 'Bazarr',
    Shelfmark = 'Shelfmark',
    Tmdb = 'Tmdb',
    FlareSolverr = 'FlareSolverr'
}

/** The value type of a setting. */
export enum SettingKind {
    Url = 'Url',
    Secret = 'Secret',
    Text = 'Text',
    Integer = 'Integer',
    Decimal = 'Decimal',
    Boolean = 'Boolean',
    LanguageList = 'LanguageList',
    TextList = 'TextList',
    /** An absolute directory path, as the server sees it. */
    Path = 'Path'
}

/** Where the value of a setting comes from. */
export enum SettingSource {
    Unset = 'Unset',
    Environment = 'Environment',
    Store = 'Store'
}

export type SettingValue = string | number | boolean | string[];

/** One setting. A secret never carries its value: `Value` is always `null`, use `IsSet`. */
export interface PufferfinSetting {
    Key: string;
    Service?: PufferfinService | null;
    Type: SettingKind;
    IsSecret: boolean;
    Value?: SettingValue | null;
    IsSet: boolean;
    Source: SettingSource;
    /** The environment provides the value: it cannot be changed from the interface. */
    IsReadOnly: boolean;
    /** An environment variable is present but ignored, because the value was changed in the interface. */
    EnvironmentIgnored: boolean;
}

export interface PufferfinServiceState {
    Service: PufferfinService;
    IsEnabled: boolean;
}

export interface PufferfinConfiguration {
    Settings: PufferfinSetting[];
    Services: PufferfinServiceState[];
}

/**
 * A partial update. An absent key is left unchanged, `null` clears the setting, any other value replaces it.
 */
export interface PufferfinConfigurationUpdate {
    Settings: Record<string, SettingValue | null>;
}

export enum ConnectionStatus {
    NotConfigured = 'NotConfigured',
    Connected = 'Connected',
    Unreachable = 'Unreachable',
    KeyRejected = 'KeyRejected'
}

export interface ConnectionTestResult {
    Service: PufferfinService;
    Status: ConnectionStatus;
    /** A diagnostic in English, for logs. Not displayed: it is not translated. */
    Detail?: string | null;
    DurationMs: number;
}

/** Which services are configured, hence enabled. Booleans only. */
export type PufferfinCapabilities = Record<PufferfinService, boolean>;

export enum AutoConfigTrigger {
    Startup = 'Startup',
    ConfigurationSaved = 'ConfigurationSaved',
    Manual = 'Manual'
}

export enum AutoConfigStepStatus {
    Applied = 'Applied',
    Unchanged = 'Unchanged',
    Skipped = 'Skipped',
    Failed = 'Failed'
}

export interface AutoConfigStepReport {
    Name: string;
    Status: AutoConfigStepStatus;
    Detail?: string | null;
}

export interface AutoConfigRun {
    Trigger: AutoConfigTrigger;
    StartedAt: string;
    CompletedAt: string;
    Steps: AutoConfigStepReport[];
}

/** The body of a 400 response: errors by setting key. */
export interface ValidationProblem {
    errors?: Record<string, string[]>;
}

/** A directory the storage screen reports on. */
export enum StorageRole {
    Media = 'Media',
    Downloads = 'Downloads'
}

/** The usage of the disk holding a directory. */
export interface DiskUsage {
    Role: StorageRole;
    Path: string;
    /** Whether the directory exists and its disk could be read. */
    Available: boolean;
    TotalBytes: number;
    FreeBytes: number;
    UsedPercent: number;
    /** Whether the usage reached `STORAGE_WARNING_PERCENT`. */
    AboveWarning: boolean;
}

export enum HardlinkStatus {
    Unknown = 'Unknown',
    Possible = 'Possible',
    Impossible = 'Impossible'
}

export interface HardlinkCheckResult {
    Status: HardlinkStatus;
    /** An English sentence. Not displayed: it is not translated. */
    Message: string;
}

export enum StorageAdviceCode {
    HardlinksImpossible = 'HardlinksImpossible',
    HardlinksUnknown = 'HardlinksUnknown',
    DiskAlmostFull = 'DiskAlmostFull',
    DirectoryMissing = 'DirectoryMissing',
    QBittorrentUnavailable = 'QBittorrentUnavailable'
}

export interface StorageAdvice {
    Code: StorageAdviceCode;
    /** An English sentence. Not displayed: the code is translated. */
    Message: string;
}

/** How the downloaded content is spread between the library and seeding. */
export interface ContentUsage {
    TorrentBytes: number;
    /** Hard linked into the library: seeding it takes no extra space. */
    SharedWithLibraryBytes: number;
    /** Only seeding holds it: what purging the torrents would free. */
    SeedingOnlyBytes: number;
    UnknownBytes: number;
}

/** Where a torrent stands for the seeding policy. */
export enum SeedState {
    Downloading = 'Downloading',
    Protected = 'Protected',
    Seeding = 'Seeding',
    /** Its title was deleted, but it keeps seeding until its minimum. */
    WaitingForRelease = 'WaitingForRelease',
    DueForPurge = 'DueForPurge'
}

/** The seeding state of one torrent. Never carries a tracker URL nor a passkey. */
export interface TorrentSeedState {
    Hash: string;
    Title: string;
    Category?: string | null;
    SizeBytes: number;
    Ratio: number;
    /** A .NET time span, such as `3.04:05:06`. */
    SeedingTime: string;
    /** `null` when qBittorrent does not say, which counts as private. */
    IsPrivate?: boolean | null;
    State: SeedState;
    ProtectedUntil?: string | null;
    /** `null` when unknown. */
    SharesSpaceWithLibrary?: boolean | null;
}

/** The seeding policy in force, with its defaults applied. */
export interface SeedPolicySummary {
    MinDays: number;
    TargetRatio?: number | null;
    MaxDays?: number | null;
    Categories: string[];
    WarningPercent: number;
}

export enum PurgeReason {
    TargetRatio = 'TargetRatio',
    MaxAge = 'MaxAge',
    Released = 'Released',
    SafeDeletion = 'SafeDeletion',
    ImmediateDeletion = 'ImmediateDeletion'
}

export interface PurgeRecord {
    Hash: string;
    Title: string;
    At: string;
    Reason: PurgeReason;
}

export interface StorageReport {
    Disks: DiskUsage[];
    Hardlinks: HardlinkCheckResult;
    Advice: StorageAdvice[];
    Content: ContentUsage;
    Torrents: TorrentSeedState[];
    Policy: SeedPolicySummary;
    LastCycleAt?: string | null;
    NextCycleAt: string;
    RecentPurges: PurgeRecord[];
}

export enum SeedCycleStatus {
    Completed = 'Completed',
    Skipped = 'Skipped',
    Failed = 'Failed'
}

export interface SeedCycleResult {
    Status: SeedCycleStatus;
    /** An English sentence. Not displayed: the status is translated. */
    Message: string;
    Purged: PurgeRecord[];
    Protected: number;
    WaitingForImport: number;
    At: string;
}

/** How a title is deleted. Safe is the default of the server. */
export enum DeletionMode {
    Safe = 'Safe',
    Immediate = 'Immediate'
}

export enum DeletionStatus {
    Planned = 'Planned',
    Deleted = 'Deleted',
    ConfirmationRequired = 'ConfirmationRequired',
    NotFound = 'NotFound',
    Forbidden = 'Forbidden',
    ServiceDisabled = 'ServiceDisabled',
    ServiceUnavailable = 'ServiceUnavailable'
}

export enum TorrentAction {
    RemoveNow = 'RemoveNow',
    KeepUntilMinimum = 'KeepUntilMinimum',
    KeepShared = 'KeepShared'
}

export interface TorrentPlan {
    Hash: string;
    Name: string;
    IsPrivate?: boolean | null;
    SeedingTime: string;
    MinimumReachedAt?: string | null;
    Action: TorrentAction;
}

export interface DeletionPlan {
    Title: {
        ItemId: string;
        Title: string;
    };
    Mode: DeletionMode;
    Torrents: TorrentPlan[];
    /** Private torrents (or of unknown privacy) that have not seeded their minimum yet. */
    PrivateBeforeMinimum: number;
    /** An English sentence. Not displayed: the client shows its own translated warning. */
    Warning?: string | null;
}

export interface DeletionOutcome {
    Status: DeletionStatus;
    /** An English sentence. Not displayed: the status is translated. */
    Message: string;
    Plan?: DeletionPlan | null;
}

export enum RequestKind {
    Movie = 'Movie',
    Season = 'Season',
    Episode = 'Episode'
}

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

/** A download request. Also the payload of the `PufferfinRequestUpdated` WebSocket message. */
export interface MediaRequest {
    Id: string;
    UserId: string;
    Kind: RequestKind;
    TmdbId: number;
    SeasonNumber?: number | null;
    EpisodeNumber?: number | null;
    Title: string;
    /** An ISO 639-1 code, or `original`. */
    Language: string;
    ChosenLanguage?: string | null;
    ReleaseTitle?: string | null;
    State: RequestState;
    Problem?: {
        Code: RequestProblemCode;
        /** An English sentence. Not displayed: the code is translated. */
        Message: string;
        /** The reason given by Radarr, Sonarr or qBittorrent, in their own words. */
        Detail?: string | null;
    } | null;
    /** From 0 to 1, while downloading. */
    Progress?: number | null;
    BytesPerSecond?: number | null;
    EtaSeconds?: number | null;
    /** One based place among the requests waiting for a slot. */
    QueuePosition?: number | null;
    CreatedAt: string;
    UpdatedAt: string;
    NextAttemptAt?: string | null;
}

/** What a user may request. Administrators may always request, without approval nor quota. */
export interface RequestPermissions {
    CanRequest: boolean;
    RequiresApproval: boolean;
    /** Requests allowed in seven days, or `null` for no limit. */
    WeeklyQuota?: number | null;
    /** May delete titles, with the safe mode only. */
    CanDelete: boolean;
    /** Read only. */
    UsedThisWeek: number;
    /** Read only. */
    IsAdministrator: boolean;
}
