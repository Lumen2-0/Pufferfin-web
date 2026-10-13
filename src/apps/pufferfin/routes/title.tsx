import { isAxiosError } from 'axios';
import React, { type FC, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import CatalogCard from '../components/CatalogCard';
import AudiobookSheet from '../features/audiobooks/components/AudiobookSheet';
import { isAsin } from '../features/audiobooks/utils/audiobooks';
import Hero from '../components/Hero';
import MediaRow from '../components/MediaRow';
import { CatalogAvailability, type CatalogItem, CatalogItemKind, type CatalogTitleDetails } from '../features/catalog/api/types';
import { useCatalogTitle, useSeriesSeasons } from '../features/catalog/api/useCatalog';
import { getOpenableItems } from '../features/catalog/utils/catalog';
import RequestActions from '../features/requests/components/RequestActions';
import { useCanRequest } from '../features/requests/api/useCanRequest';
import { useMyRequests } from '../features/requests/api/useRequests';
import { RequestKind } from '../features/requests/api/types';
import { findMovieRequest, findSeriesRequests, isRequestActive } from '../features/requests/utils/requests';
import { getMissingSeasons } from '../features/series/utils/episodes';
import SeasonDownloads, { getListedSeasons } from '../features/series/components/SeasonDownloads';
import SeriesEpisodes from '../features/series/components/SeriesEpisodes';
import TrailerButton from '../features/trailers/TrailerButton';
import BookmarkButton from '../features/bookmarks/BookmarkButton';
import ReviewLink from '../features/reviews/ReviewLink';
import type { StringKey } from '../i18n/translate';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { ItemDetails } from './item';
import { type CatalogTitleKind, getMarketParam, getTmdbPersonPath, parseSheetTarget } from './paths';
import CatalogCastRow from '../features/details/components/CatalogCastRow';
import { DetailsSkeleton } from '../components/Skeleton';
import { ErrorOutline } from '../components/icons';
import { type CreditLink, HeroFacts } from '../components/CreditLine';

import '../features/details/details.scss';

const GENRE_LIMIT = 3;
const HTTP_SERVICE_UNAVAILABLE = 503;

const getKey = (item: CatalogItem) => item.Key;
const renderCard = (item: CatalogItem) => <CatalogCard item={item} />;

/** Facts line of the sheet: year, runtime or number of seasons, first genres; each value once. */
function getTitleMeta(kind: CatalogTitleKind, title: CatalogTitleDetails, t: ReturnType<typeof useTranslation>): string[] {
    let lengthText: string | undefined;
    if (kind === CatalogItemKind.Series && title.NumberOfSeasons) {
        lengthText = title.NumberOfSeasons === 1 ? t('SeasonCountOne') : t('SeasonCount', title.NumberOfSeasons);
    } else if (kind === CatalogItemKind.Movie && title.RuntimeMinutes) {
        const hours = Math.floor(title.RuntimeMinutes / 60);
        const minutes = title.RuntimeMinutes % 60;
        lengthText = hours ? t('DurationHoursMinutes', hours, minutes) : t('DurationMinutes', minutes);
    }
    return [
        title.Year ? String(title.Year) : undefined,
        lengthText,
        title.Genres.slice(0, GENRE_LIMIT).map(genre => genre.Name).join(', ')
    ]
        .filter((value): value is string => !!value)
        .filter((value, index, values) => values.indexOf(value) === index);
}

/** The directors of a film, the creators of a series, with the words that name them: each opens their page with all their titles. */
function getMakers(kind: CatalogTitleKind, title: CatalogTitleDetails | undefined): { labelKey: StringKey, people: CreditLink[] } {
    const isMovie = kind === CatalogItemKind.Movie;
    const people = (title?.Crew ?? [])
        .filter(credit => credit.Role === (isMovie ? 'Director' : 'Creator'))
        .map(credit => ({ key: String(credit.TmdbId), name: credit.Name, path: getTmdbPersonPath(credit.TmdbId) }));
    return { labelKey: isMovie ? 'DirectedBy' : 'CreatedBy', people };
}

/**
 * Title sheet opened by TMDB id. The server tells whether the title is on
 * disk: then the sheet is the library one, with Play. Otherwise it is built
 * from the catalog.
 * A movie can be downloaded from here when Radarr is enabled and the account
 * may request; a series tells plainly that it is not in the library, its
 * seasons and episodes come with the series download.
 */
const CatalogTitle: FC<{ kind: CatalogTitleKind, tmdbId: number }> = ({ kind, tmdbId }) => {
    const t = useTranslation();
    const pageRef = useRef<HTMLDivElement>(null);

    const { data: title, isPending, isError, error } = useCatalogTitle(kind, tmdbId);
    const isMovie = kind === CatalogItemKind.Movie;
    const requests = useMyRequests();
    // Buttons of services that are not configured never show: Radarr for a movie, Sonarr for the episodes of a series
    const rights = useCanRequest(isMovie ? 'Radarr' : 'Sonarr');
    const request = isMovie ? findMovieRequest(requests.data, tmdbId) : undefined;
    // A series lists its seasons and episodes from TMDB, each missing episode downloadable on its own
    const seriesSeasons = useSeriesSeasons(isMovie ? undefined : tmdbId);
    const movieRequestInput = useMemo(() => ({ Kind: RequestKind.Movie, TmdbId: tmdbId }), [ tmdbId ]);
    // A series downloads season by season: every season already aired with episodes missing
    const seasonRequestInputs = useMemo(
        () => getMissingSeasons(seriesSeasons.data?.Seasons ?? [], new Date())
            .map(season => ({ Kind: RequestKind.Season, TmdbId: tmdbId, SeasonNumber: season.SeasonNumber })),
        [ seriesSeasons.data, tmdbId ]
    );
    const seriesRequests = useMemo(() => findSeriesRequests(requests.data, tmdbId), [ requests.data, tmdbId ]);
    const isContentSettled = isMovie ? !requests.isPending : !seriesSeasons.isPending;
    const areActionsSettled = rights.isSettled && isContentSettled;

    // The focus waits for the actions, so it lands on Download rather than on the overview
    useInitialFocus(pageRef, [ title, areActionsSettled ], !!title && areActionsSettled);

    const meta = useMemo(() => (title ? getTitleMeta(kind, title, t) : []), [ kind, t, title ]);
    const bookmark = useMemo(() => ({
        kind,
        tmdbId,
        title: title?.Title ?? '',
        year: title?.Year,
        posterUrl: title?.PosterUrl
    }), [ kind, title, tmdbId ]);
    const makers = useMemo(() => getMakers(kind, title), [ kind, title ]);

    if (isPending) return <DetailsSkeleton />;

    if (isError || !title) {
        const isUnavailable = isAxiosError(error) && error.response?.status === HTTP_SERVICE_UNAVAILABLE;
        return (
            <div className='pf-status' role='status'>
                <ErrorOutline aria-hidden='true' />
                <p>{isUnavailable ? t('CatalogUnavailable') : t('ItemLoadError')}</p>
            </div>
        );
    }

    // On disk: the same sheet, with Play and everything the library knows. It also
    // takes over without a reload once a download is imported and the catalog is read again.
    if (title.Availability === CatalogAvailability.OnDisk && title.LocalItemId) {
        return <ItemDetails key={title.LocalItemId} itemId={title.LocalItemId} />;
    }

    const countries = title.Countries.map(country => country.Name).filter(Boolean).join(', ');
    const hasOriginalTitle = !!title.OriginalTitle && title.OriginalTitle !== title.Title;

    return (
        <div ref={pageRef} className='pf-details'>
            <Hero
                variant='sheet'
                title={title.Title}
                eyebrow={title.Tagline ?? undefined}
                meta={<HeroFacts meta={meta} label={t(makers.labelKey)} people={makers.people} />}
                overview={title.Overview}
                backdropUrl={title.BackdropUrl ?? title.PosterUrl ?? undefined}
                actions={isMovie ? (
                    <RequestActions
                        requestInput={movieRequestInput}
                        request={request}
                        canRequest={rights.canRequest}
                        lastSyncAt={requests.dataUpdatedAt}
                        allowTemporary
                    >
                        <BookmarkButton bookmark={bookmark} withLabel />
                        <TrailerButton videos={title.Trailers} title={title.Title} />
                        <ReviewLink title={title.Title} year={title.Year} isMovie tmdbId={tmdbId} />
                    </RequestActions>
                ) : (
                    <RequestActions
                        requestInput={seasonRequestInputs}
                        request={seriesRequests}
                        canRequest={rights.canRequest && seasonRequestInputs.length > 0}
                        lastSyncAt={requests.dataUpdatedAt}
                        downloadLabel={t('ActionDownloadAllSeasons')}
                    >
                        <BookmarkButton bookmark={bookmark} withLabel />
                        {rights.canRequest && seriesSeasons.data && getListedSeasons(seriesSeasons.data.Seasons).length > 1 && (
                            <SeasonDownloads
                                seriesTmdbId={tmdbId}
                                seriesTitle={title.Title}
                                seasons={seriesSeasons.data.Seasons}
                                canRequest={rights.canRequest}
                                asText={seriesRequests.some(isRequestActive)}
                            />
                        )}
                        <TrailerButton videos={title.Trailers} title={title.Title} />
                        <ReviewLink title={title.Title} year={title.Year} isMovie={false} />
                    </RequestActions>
                )}
            />

            <div className='pf-details__sections'>
                {!isMovie && seriesSeasons.data && (
                    <SeriesEpisodes
                        seriesTmdbId={tmdbId}
                        seasons={seriesSeasons.data.Seasons}
                        canRequest={rights.canRequest}
                    />
                )}
                {!isMovie && seriesSeasons.isError && (
                    // Failure is told with an icon and words, never with color alone
                    <p className='pf-row__error' role='status'>
                        <ErrorOutline aria-hidden='true' />
                        {t('RowLoadError')}
                    </p>
                )}

                <CatalogCastRow cast={title.Cast} />

                <MediaRow
                    title={t('RowMoreLikeThis')}
                    shape='portrait'
                    items={getOpenableItems(title.Recommendations)}
                    isPending={false}
                    isError={false}
                    getKey={getKey}
                    renderItem={renderCard}
                />

                <section
                    className='pf-about'
                    aria-labelledby='pf-about-title'
                    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- remote users must reach a section that holds only text
                    tabIndex={0}
                    {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                >
                    <h2 id='pf-about-title' className='pf-row__title pf-about__title'>{t('SectionAbout')}</h2>
                    <div className='pf-about__body'>
                        {title.Overview && <p className='pf-about__overview'>{title.Overview}</p>}
                        <dl className='pf-about__facts'>
                            {hasOriginalTitle && (
                                <>
                                    <dt>{t('LabelOriginalTitle')}</dt>
                                    <dd>{title.OriginalTitle}</dd>
                                </>
                            )}
                            {title.Genres.length > 0 && (
                                <>
                                    <dt>{t('LabelGenres')}</dt>
                                    <dd>{title.Genres.map(genre => genre.Name).join(', ')}</dd>
                                </>
                            )}
                            {countries && (
                                <>
                                    <dt>{t('LabelCountries')}</dt>
                                    <dd>{countries}</dd>
                                </>
                            )}
                        </dl>
                    </div>
                </section>
            </div>
        </div>
    );
};

/**
 * The one title sheet: `title/item/{library id}`, `title/movie|series/{TMDB id}`
 * or `title/audiobook/{ASIN}`. A title on disk shows Play whichever way it is
 * opened; a missing one shows Download.
 */
export const Component = () => {
    const params = useParams();
    const [ searchParams ] = useSearchParams();
    const t = useTranslation();
    const target = parseSheetTarget(params.kind, params.id, isAsin);

    // Each sheet is keyed by its title: opening a recommendation starts from a clean page state
    switch (target?.kind) {
        case 'item':
            return <ItemDetails key={target.itemId} itemId={target.itemId} />;
        case 'catalog':
            return <CatalogTitle key={`${target.titleKind}-${target.tmdbId}`} kind={target.titleKind} tmdbId={target.tmdbId} />;
        case 'audiobook':
            return <AudiobookSheet key={target.asin} asin={target.asin} market={getMarketParam(searchParams)} />;
        default:
            return (
                <div className='pf-status' role='status'>
                    <ErrorOutline aria-hidden='true' />
                    <p>{t('ItemLoadError')}</p>
                </div>
            );
    }
};

Component.displayName = 'PufferfinTitleSheetPage';
