import CloudOutlined from '@mui/icons-material/CloudOutlined';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import { isAxiosError } from 'axios';
import React, { type FC, useMemo, useRef } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import CatalogCard from '../components/CatalogCard';
import Hero from '../components/Hero';
import MediaRow from '../components/MediaRow';
import { CatalogAvailability, type CatalogItem, CatalogItemKind } from '../features/catalog/api/types';
import { useCatalogTitle } from '../features/catalog/api/useCatalog';
import { getOpenableItems } from '../features/catalog/utils/catalog';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { type CatalogTitleKind, getItemPath, parseCatalogTitleKind } from './paths';

const GENRE_LIMIT = 3;
const HTTP_SERVICE_UNAVAILABLE = 503;

const getKey = (item: CatalogItem) => item.Key;
const renderCard = (item: CatalogItem) => <CatalogCard item={item} />;

/**
 * Sheet of a movie or a series that is not in the library, from the catalog.
 * Downloading it comes with the Requests module; until then the sheet tells
 * plainly that the title is not in the library.
 */
const CatalogTitle: FC<{ kind: CatalogTitleKind, tmdbId: number }> = ({ kind, tmdbId }) => {
    const t = useTranslation();
    const pageRef = useRef<HTMLDivElement>(null);

    const { data: title, isPending, isError, error } = useCatalogTitle(kind, tmdbId);

    // No action to start from: the full overview takes the focus first
    useInitialFocus(pageRef, [ title ], !!title);

    const meta = useMemo(() => {
        if (!title) return [];
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
    }, [ kind, t, title ]);

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
                actions={
                    // A state, not a button: told by an icon and words, never by color alone
                    <p className='pf-availability'>
                        <CloudOutlined className='pf-availability__icon' fontSize='inherit' aria-hidden='true' />
                        {t('NotInLibrary')}
                    </p>
                }
            />

            <div className='pf-details__sections'>
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
    const kind = parseCatalogTitleKind(params.kind);
    const tmdbId = Number(params.tmdbId);
    const t = useTranslation();

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
