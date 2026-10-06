import CloudOutlined from '@mui/icons-material/CloudOutlined';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import { isAxiosError } from 'axios';
import React, { type FC, useMemo, useRef } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';

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
import { findMovieRequest } from '../features/requests/utils/requests';
import SeriesEpisodes from '../features/series/components/SeriesEpisodes';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { AUDIOBOOK_SEGMENT, type CatalogTitleKind, getItemPath, getMarketParam, parseCatalogTitleKind } from './paths';

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

/**
 * Sheet of a movie or a series that is not in the library, from the catalog.
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
    const movieRequestInput = useMemo(() => ({ Kind: RequestKind.Movie, TmdbId: tmdbId }), [ tmdbId ]);
    // A series lists its seasons and episodes from TMDB, each missing episode downloadable on its own
    const seriesSeasons = useSeriesSeasons(isMovie ? undefined : tmdbId);
    const isContentSettled = isMovie ? !requests.isPending : !seriesSeasons.isPending;
    const areActionsSettled = rights.isSettled && isContentSettled;

    // The focus waits for the actions, so it lands on Download rather than on the overview
    useInitialFocus(pageRef, [ title, areActionsSettled ], !!title && areActionsSettled);

    const meta = useMemo(() => (title ? getTitleMeta(kind, title, t) : []), [ kind, t, title ]);

    if (isPending) {
        return (
            <div className='pf-status' aria-busy='true'>
                <p>{t('Loading')}</p>
            </div>
        );
    }

    if (isError || !title) {
        const isUnavailable = isAxiosError(error) && error.response?.status === HTTP_SERVICE_UNAVAILABLE;
        return (
            <div className='pf-status' role='status'>
                <ErrorOutline aria-hidden='true' />
                <p>{isUnavailable ? t('CatalogUnavailable') : t('ItemLoadError')}</p>
            </div>
        );
    }

    // Already in the library: its own detail page has Play and the episodes
    if (title.Availability === CatalogAvailability.OnDisk && title.LocalItemId) {
        return <Navigate to={getItemPath(title.LocalItemId)} replace />;
    }

    const countries = title.Countries.map(country => country.Name).filter(Boolean).join(', ');
    const hasOriginalTitle = !!title.OriginalTitle && title.OriginalTitle !== title.Title;

    return (
        <div ref={pageRef} className='pf-details'>
            <Hero
                title={title.Title}
                eyebrow={title.Tagline ?? undefined}
                meta={meta.length > 0 && (
                    <ul className='pf-meta'>
                        {meta.map(value => <li key={value} className='pf-meta__item'>{value}</li>)}
                    </ul>
                )}
                overview={title.Overview}
                backdropUrl={title.BackdropUrl ?? title.PosterUrl ?? undefined}
                actions={isMovie ? (
                    <RequestActions
                        requestInput={movieRequestInput}
                        request={request}
                        canRequest={rights.canRequest}
                        lastSyncAt={requests.dataUpdatedAt}
                    />
                ) : (
                    // A state, not a button: told by an icon and words, never by color alone
                    <p className='pf-availability'>
                        <CloudOutlined className='pf-availability__icon' fontSize='inherit' aria-hidden='true' />
                        {t('NotInLibrary')}
                    </p>
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

                <MediaRow
                    title={t('RowMoreLikeThis')}
                    shape='portrait'
                    items={getOpenableItems(title.Recommendations)}
                    isPending={false}
                    isError={false}
                    getKey={getKey}
                    renderItem={renderCard}
                />
            </div>
        </div>
    );
};

export const Component = () => {
    const params = useParams();
    const [ searchParams ] = useSearchParams();
    const kind = parseCatalogTitleKind(params.kind);
    const tmdbId = Number(params.id);
    const t = useTranslation();

    // Audiobooks share this route, by Audible ASIN: no separate sheet route
    if (params.kind === AUDIOBOOK_SEGMENT && isAsin(params.id)) {
        const asin = params.id;
        return <AudiobookSheet key={asin} asin={asin} market={getMarketParam(searchParams)} />;
    }

    if (!kind || !Number.isInteger(tmdbId) || tmdbId <= 0) {
        return (
            <div className='pf-status' role='status'>
                <ErrorOutline aria-hidden='true' />
                <p>{t('ItemLoadError')}</p>
            </div>
        );
    }

    // Keyed by title: opening a recommendation starts from a clean page state
    return <CatalogTitle key={`${kind}-${tmdbId}`} kind={kind} tmdbId={tmdbId} />;
};

Component.displayName = 'PufferfinCatalogTitlePage';
