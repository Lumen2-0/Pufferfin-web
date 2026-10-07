import { getCatalogAudiobookPath, getCatalogTitlePath, getItemPath } from '../../../routes/paths';
import {
    CatalogAvailability,
    type CatalogItem,
    CatalogItemKind,
    type CatalogListResponse,
    type CatalogSourceReport,
    CatalogSourceStatus
} from '../api/types';

/**
 * The source that explains an empty list, when it failed. A source that is
 * not configured is not a failure: its row simply does not show.
 */
export function getCatalogListFailure(response: CatalogListResponse): CatalogSourceReport | undefined {
    if (response.Items.length > 0) return undefined;
    return response.Sources.find(source => (
        source.Status !== CatalogSourceStatus.Ok && source.Status !== CatalogSourceStatus.Disabled
    ));
}

export function isMissing(item: { Availability: CatalogAvailability }) {
    return item.Availability === CatalogAvailability.Missing;
}

/**
 * Screen that shows a catalog entry: always the one title sheet. By library id
 * when the server already names the local item, by TMDB id otherwise; on the
 * TMDB address the sheet asks the server whether the title is on disk, and
 * shows Play or Download. Undefined for the kinds Pufferfin has no screen for yet.
 */
export function getCatalogItemPath(item: CatalogItem): string | undefined {
    // An audiobook has one sheet, on disk or not: Listen or Download is there
    if (item.Kind === CatalogItemKind.Audiobook) {
        return item.Asin ? getCatalogAudiobookPath(item.Asin, item.Market) : undefined;
    }
    if (item.Availability === CatalogAvailability.OnDisk && item.LocalItemId) {
        return getItemPath(item.LocalItemId);
    }
    if ((item.Kind === CatalogItemKind.Movie || item.Kind === CatalogItemKind.Series) && item.TmdbId) {
        return getCatalogTitlePath(item.Kind, item.TmdbId);
    }
    return undefined;
}

/** Entries a row can show: the ones with a screen to open, so no card is a dead end. */
export function getOpenableItems(items: CatalogItem[] | undefined) {
    return items?.filter(item => !!getCatalogItemPath(item));
}
