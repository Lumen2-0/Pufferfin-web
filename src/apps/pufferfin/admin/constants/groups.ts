import { PufferfinService } from 'apps/pufferfin/api/types';

/** The configuration pages of the admin section, in menu order. */
export enum SettingsGroupId {
    Catalogs = 'catalogs',
    Movies = 'movies',
    Series = 'series',
    Downloads = 'downloads',
    Optional = 'optional',
    Language = 'language',
    Behavior = 'behavior'
}

export interface SettingsGroup {
    id: SettingsGroupId;
    /** Services configured on the page. Their settings are the ones the server attaches to them. */
    services: PufferfinService[];
    /** Settings that belong to no service, by key, in display order. */
    settings: string[];
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
    {
        id: SettingsGroupId.Catalogs,
        services: [ PufferfinService.Tmdb ],
        settings: [ 'TMDB_LANGUAGES', 'AUDIBLE_MARKETS' ]
    },
    {
        id: SettingsGroupId.Movies,
        services: [ PufferfinService.Radarr ],
        settings: []
    },
    {
        id: SettingsGroupId.Series,
        services: [ PufferfinService.Sonarr ],
        settings: []
    },
    {
        id: SettingsGroupId.Downloads,
        services: [ PufferfinService.Prowlarr, PufferfinService.QBittorrent ],
        settings: [ 'MEDIA_PATH', 'DOWNLOADS_PATH' ]
    },
    {
        id: SettingsGroupId.Optional,
        services: [ PufferfinService.Bazarr, PufferfinService.Shelfmark, PufferfinService.FlareSolverr ],
        settings: []
    },
    {
        id: SettingsGroupId.Language,
        services: [],
        settings: [ 'PREFERRED_AUDIO_LANGUAGES', 'REJECT_SUBTITLED_ONLY' ]
    },
    {
        id: SettingsGroupId.Behavior,
        services: [],
        settings: [
            'MAX_CONCURRENT_DOWNLOADS',
            'SEED_MIN_DAYS',
            'SEED_MAX_DAYS',
            'SEED_TARGET_RATIO',
            'SEED_CATEGORIES',
            'STORAGE_WARNING_PERCENT'
        ]
    }
];

export const getSettingsGroup = (id: string | undefined) => SETTINGS_GROUPS.find(group => group.id === id);

export const getServiceGroup = (service: PufferfinService) => SETTINGS_GROUPS.find(group => group.services.includes(service));

export const getGroupPath = (id: SettingsGroupId) => `/dashboard/pufferfin/${id}`;

export const OVERVIEW_PATH = '/dashboard/pufferfin';
