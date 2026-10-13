/** The library a title belongs to, as the server sorts them. */
export type ContentCategory = 'Movie' | 'Series' | 'Anime' | 'Documentary' | 'Audiobook';

/** The kind of trackers the torrents of a title come from; Unknown counts as private. */
export type ContentTracker = 'None' | 'Public' | 'Private' | 'Mixed' | 'Unknown';

export interface ContentTorrent {
    Hash: string;
    Name: string;
    AddedAt?: string | null;
    Ratio: number;
    IsPrivate?: boolean | null;
    SizeBytes: number;
    /** Until when this private torrent must keep seeding. */
    ProtectedUntil?: string | null;
}

/** A whole title on disk: a film, a series or an audiobook. */
export interface ContentRow {
    ItemId: string;
    Kind: 'Movie' | 'Series' | 'Audiobook';
    Category: ContentCategory;
    Title: string;
    Year?: number | null;
    SizeBytes: number;
    Torrents: ContentTorrent[];
    /** When its oldest torrent was added. */
    AddedAt?: string | null;
    /** The ratio of its torrents, weighted by their size. */
    Ratio?: number | null;
    Tracker: ContentTracker;
    /** Until when one of its private torrents must keep seeding. */
    ProtectedUntil?: string | null;
    /** When its scheduled deletion is due. */
    DeletionDueAt?: string | null;
}

export interface ContentInventory {
    Rows: ContentRow[];
    /** Whether qBittorrent could be read: without it the rows have no torrents. */
    TorrentsAvailable: boolean;
    MinSeedingDays: number;
}

export interface ScheduledDeletion {
    ItemId: string;
    DueAt: string;
}
