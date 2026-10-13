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
    SpotlightFilter.People,
    SpotlightFilter.Audiobooks
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

/** How many titles on disk come first, in their own section, when every kind is listed. */
export const LIBRARY_SECTION_LIMIT = 5;

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

/** A section of the list: the titles on disk first, then one per kind. */
export type SectionId = 'library' | Exclude<SpotlightFilter, SpotlightFilter.All>;

/** One line of the list: an entry to open, or See all of a kind. */
export type SpotlightLine =
    | { type: 'result', item: CatalogItem }
    | { type: 'more', filter: SpotlightFilter, count: number };

export interface SpotlightSection {
    id: SectionId
    /** The search the section reads, to tell it is still loading. */
    source: 'titles' | 'audiobooks'
    lines: SpotlightLine[]
}

const KIND_FILTERS: Exclude<SpotlightFilter, SpotlightFilter.All>[] = [
    SpotlightFilter.Movies,
    SpotlightFilter.Series,
    SpotlightFilter.People,
    SpotlightFilter.Audiobooks
];

const sourceOf = (filter: Exclude<SpotlightFilter, SpotlightFilter.All>) =>
    (filter === SpotlightFilter.Audiobooks ? 'audiobooks' : 'titles');

const isOnDiskTitle = (item: CatalogItem) =>
    item.Availability === CatalogAvailability.OnDisk
    && (item.Kind === CatalogItemKind.Movie || item.Kind === CatalogItemKind.Series);

/**
 * The sections of the list. With a filter, the whole list of that kind.
 * Without, the films and series on disk first, under their own heading, then
 * a few entries of each kind not already shown, with See all when there are more.
 */
export function getSpotlightSections(
    filter: SpotlightFilter,
    titles: CatalogItem[] | undefined,
    audiobooks: CatalogItem[] | undefined
): SpotlightSection[] {
    const resultsOf = (kindFilter: Exclude<SpotlightFilter, SpotlightFilter.All>) =>
        getKindResults(kindFilter === SpotlightFilter.Audiobooks ? audiobooks : titles, FILTER_KINDS[kindFilter]);
    const toLines = (items: CatalogItem[]): SpotlightLine[] => items.map(item => ({ type: 'result', item }));

    if (filter !== SpotlightFilter.All) {
        return [ { id: filter, source: sourceOf(filter), lines: toLines(resultsOf(filter)) } ];
    }

    const onDisk = [ ...resultsOf(SpotlightFilter.Movies), ...resultsOf(SpotlightFilter.Series) ]
        .filter(isOnDiskTitle);
    // In the order the search ranks them, films and series mixed
    const order = new Map((titles ?? []).map((item, index) => [ item.Key, index ]));
    onDisk.sort((a, b) => (order.get(a.Key) ?? 0) - (order.get(b.Key) ?? 0));
    const library = onDisk.slice(0, LIBRARY_SECTION_LIMIT);
    const shownKeys = new Set(library.map(item => item.Key));

    const sections: SpotlightSection[] = [ { id: 'library', source: 'titles', lines: toLines(library) } ];
    for (const kindFilter of KIND_FILTERS) {
        const results = resultsOf(kindFilter);
        const shown = results.filter(item => !shownKeys.has(item.Key)).slice(0, SECTION_LIMIT);
        const shownOfKind = shown.length + results.filter(item => shownKeys.has(item.Key)).length;
        const lines = toLines(shown);
        if (results.length > shownOfKind) lines.push({ type: 'more', filter: kindFilter, count: results.length });
        sections.push({ id: kindFilter, source: sourceOf(kindFilter), lines });
    }
    return sections;
}
