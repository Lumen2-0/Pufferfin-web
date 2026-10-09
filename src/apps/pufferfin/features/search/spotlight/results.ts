import { CatalogAvailability, type CatalogItem, CatalogItemKind } from '../../catalog/api/types';
import { getCatalogItemPath } from '../../catalog/utils/catalog';
import { getPersonPath } from '../../../routes/paths';

/** The filters of the panel; All shows every kind in its own section. */
export enum SpotlightFilter {
    All = 'all',
    Movies = 'movies',
    Series = 'series',
    Audiobooks = 'audiobooks',
    People = 'people'
}

export const SPOTLIGHT_FILTERS: SpotlightFilter[] = [
    SpotlightFilter.All,
    SpotlightFilter.Movies,
    SpotlightFilter.Series,
    SpotlightFilter.Audiobooks,
    SpotlightFilter.People
];

/** The kind of catalog entry each filter keeps. */
export const FILTER_KINDS: Record<Exclude<SpotlightFilter, SpotlightFilter.All>, CatalogItemKind> = {
    [SpotlightFilter.Movies]: CatalogItemKind.Movie,
    [SpotlightFilter.Series]: CatalogItemKind.Series,
    [SpotlightFilter.Audiobooks]: CatalogItemKind.Audiobook,
    [SpotlightFilter.People]: CatalogItemKind.Person
};

/** How many results a section shows when every kind is listed; See all shows the rest. */
export const SECTION_LIMIT = 4;

/**
 * Where a result leads: the sheet of a title, on disk or not, or the page of
 * a person of the library. A person TMDB knows but the library does not has
 * no page yet: no result for them.
 */
export function getResultPath(item: CatalogItem): string | undefined {
    if (item.Kind === CatalogItemKind.Person) {
        return item.Availability === CatalogAvailability.OnDisk && item.LocalItemId ? getPersonPath(item.LocalItemId) : undefined;
    }
    return getCatalogItemPath(item);
}

/** The results of one kind that lead somewhere, each title once. */
export function getKindResults(items: CatalogItem[] | undefined, kind: CatalogItemKind): CatalogItem[] {
    const keys = new Set<string>();
    return (items ?? []).filter(item => item.Kind === kind && !!getResultPath(item) && !keys.has(item.Key) && !!keys.add(item.Key));
}
