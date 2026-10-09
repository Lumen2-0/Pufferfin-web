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

/**
 * A key that stays the same through the states of an episode: its numbers.
 * The library item only names a file the library could not number. A key
 * holding the library item would change at import and remount the card,
 * dropping the focus.
 */
export const getEpisodeKey = (episode: CatalogEpisode) => (episode.EpisodeNumber != null ?
    `${episode.SeasonNumber}-${episode.EpisodeNumber}-${episode.EpisodeNumberEnd ?? ''}` :
    `${episode.SeasonNumber}-file-${episode.LocalItemId ?? ''}`);

/**
 * The seasons a series download asks for: the numbered ones (no specials),
 * already started airing, with episodes missing from the library.
 */
export function getMissingSeasons(seasons: CatalogSeason[], today: Date): CatalogSeason[] {
    return seasons.filter(season => season.SeasonNumber > 0
        && !!season.AirDate
        && Date.parse(season.AirDate) <= today.getTime()
        && (season.EpisodeCount == null || season.LocalEpisodeCount < season.EpisodeCount));
}
