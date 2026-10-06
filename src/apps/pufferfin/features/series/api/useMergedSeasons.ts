import { useSeriesSeasons } from '../../catalog/api/useCatalog';

/**
 * The seasons of a library series, merged with TMDB, when the series has a
 * TMDB id and the catalog answers. Otherwise the page falls back to the
 * library seasons, as before the merge: without TMDB (no id, not configured,
 * not reachable) nothing is lost.
 */
export const useMergedSeasons = (seriesId: string | undefined, tmdbIdText: string | null | undefined) => {
    const tmdbId = seriesId ? Number(tmdbIdText) || undefined : undefined;
    const query = useSeriesSeasons(tmdbId);
    const seasons = tmdbId && query.data?.Seasons.length ? query.data.Seasons : undefined;
    const showLibrarySeasons = !!seriesId && (!tmdbId || query.isError || (!query.isPending && !seasons));
    return { tmdbId, seasons, showLibrarySeasons };
};
