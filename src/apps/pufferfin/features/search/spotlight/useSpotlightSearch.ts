import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

import { getPufferfin } from '../../../api/client';
import type { CatalogItem } from '../../catalog/api/types';
import { isSearchable, normalizeQuery } from '../utils/query';

import { SpotlightFilter } from './results';

interface SearchResponse {
    Items: CatalogItem[]
}

const LIMIT = 30;

/**
 * The searches of the panel, one per source, so each section shows as soon as
 * its source answers: films, series and people (the library and TMDB, fast),
 * audiobooks (Audible). A filter reads its source only.
 */
export function useSpotlightSearch(query: string, filter: SpotlightFilter) {
    const { api, user } = useApi();
    const text = normalizeQuery(query);
    const isActive = !!api && !!user?.Id && isSearchable(text);
    const wants = (...filters: SpotlightFilter[]) => isActive && (filter === SpotlightFilter.All || filters.includes(filter));

    const titles = useQuery({
        queryKey: [ 'Pufferfin', 'Spotlight', 'Titles', text, user?.Id ],
        queryFn: async ({ signal }) => (await getPufferfin<SearchResponse>(api!, '/Pufferfin/Catalog/Search', {
            params: { query: text, kinds: 'Movie,Series,Person', limit: LIMIT },
            signal
        })).Items,
        enabled: wants(SpotlightFilter.Movies, SpotlightFilter.Series, SpotlightFilter.People),
        placeholderData: keepPreviousData
    });

    const audiobooks = useQuery({
        queryKey: [ 'Pufferfin', 'Spotlight', 'Audiobooks', text, user?.Id ],
        queryFn: async ({ signal }) => (await getPufferfin<SearchResponse>(api!, '/Pufferfin/Catalog/Search', {
            params: { query: text, kinds: 'Audiobook', limit: LIMIT },
            signal
        })).Items,
        enabled: wants(SpotlightFilter.Audiobooks),
        placeholderData: keepPreviousData
    });

    return { titles, audiobooks, isActive };
}
