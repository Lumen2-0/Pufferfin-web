import type { CatalogEpisode, CatalogSeason } from '../../catalog/api/types';
import { type MediaRequest, RequestKind, RequestState } from '../../requests/api/types';
import { isRequestActive } from '../../requests/utils/requests';

const SPECIALS_SEASON = 0;

/**
 * The request that speaks for a missing episode: an active or failed request
 * of this very episode first, else an active request of its whole season.
 * Cancelled, refused and finished requests do not count: the episode can be
 * asked again.
 */
export function findEpisodeRequest(
    requests: MediaRequest[] | undefined,
    seriesTmdbId: number,
    episode: CatalogEpisode
): MediaRequest | undefined {
    if (episode.EpisodeNumber == null) return undefined;
    const isOpen = (item: MediaRequest) => isRequestActive(item) || item.State === RequestState.Failed;
    const ofSeries = (requests ?? []).filter(item => item.TmdbId === seriesTmdbId && item.SeasonNumber === episode.SeasonNumber && isOpen(item));
    return ofSeries.find(item => item.Kind === RequestKind.Episode && item.EpisodeNumber === episode.EpisodeNumber)
        ?? ofSeries.find(item => item.Kind === RequestKind.Season && isRequestActive(item));
}

/**
 * The season shown first: the one holding the next episode to watch when the
 * library knows it, else the first regular season, else the first one
 * (specials only). Undefined when there is no season.
 */
export function getDefaultSeasonNumber(seasons: CatalogSeason[] | undefined, nextUpSeasonItemId?: string | null) {
    if (!seasons?.length) return undefined;
    const withNextUp = nextUpSeasonItemId ? seasons.find(season => season.LocalItemId === nextUpSeasonItemId) : undefined;
    return (withNextUp ?? seasons.find(season => season.SeasonNumber !== SPECIALS_SEASON) ?? seasons[0]).SeasonNumber;
}

/** A stable key for an episode: its number, else its library item for a file the library could not number. */
export const getEpisodeKey = (episode: CatalogEpisode) =>
    `${episode.SeasonNumber}-${episode.EpisodeNumber ?? 'x'}-${episode.EpisodeNumberEnd ?? ''}-${episode.LocalItemId ?? ''}`;
