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
    TextList = 'TextList'
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
