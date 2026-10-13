/** The preference that shows a "Download" link on every title on disk; off unless the user turns it on. */
export const CONTENT_DOWNLOAD_SETTING = 'pufferfin-content-download';

/** Whether the stored value of the preference turns it on. */
export const parseContentDownload = (value: string | null | undefined) => value === 'true';

interface DownloadableItem {
    Id?: string | null
    /** Computed by the server for the user: false when their policy or the item forbids it. */
    CanDownload?: boolean | null
    /** Only a file on disk can be downloaded: a series or a season has none of its own. */
    MediaType?: string | null
    LocationType?: string | null
    IsFolder?: boolean | null
}

interface DownloadPolicy {
    EnableContentDownloading?: boolean | null
}

/**
 * Whether the link shows for an item: the user turned it on, their policy
 * lets them download, and the item is one file on disk. The server's own
 * CanDownload, when it is known, has the last word.
 */
export function canDownloadFile(item: DownloadableItem | undefined, policy: DownloadPolicy | null | undefined, isEnabled: boolean): boolean {
    if (!isEnabled || !item?.Id || !policy?.EnableContentDownloading) return false;
    if (item.CanDownload === false) return false;
    if (item.IsFolder) return false;
    if (item.LocationType && item.LocationType !== 'FileSystem') return false;
    return item.MediaType === 'Video' || item.MediaType === 'Audio' || item.MediaType === 'Book';
}
