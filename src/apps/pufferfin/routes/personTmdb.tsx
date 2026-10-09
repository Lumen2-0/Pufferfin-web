import React, { type FC, useMemo, useRef } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import datetime from 'scripts/datetime';

import CatalogCard from '../components/CatalogCard';
import { ErrorOutline } from '../components/icons';
import { GridSkeleton, PersonSkeleton } from '../components/Skeleton';
import { useCatalogPerson } from '../features/catalog/api/useCatalog';
import { getOpenableItems } from '../features/catalog/utils/catalog';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE, FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { getPersonPath } from './paths';

const formatDate = (iso: string | null | undefined) => {
    if (!iso) return undefined;
    const date = new Date(iso);
    return isNaN(date.getTime()) ? undefined : datetime.toLocaleDateString(date, { year: 'numeric', month: 'long', day: 'numeric' });
};

/**
 * Page of a person read from TMDB, for someone the library does not know: a
 * director, a cast member of a missing title. The portrait, the facts, then
 * every film and series, best known first, each on disk or downloadable.
 * Someone the library knows opens their library page instead.
 */
const TmdbPersonDetails: FC<{ tmdbId: number }> = ({ tmdbId }) => {
    const t = useTranslation();
    const pageRef = useRef<HTMLDivElement>(null);
    const { data: person, isPending, isError } = useCatalogPerson(tmdbId);
    const titles = useMemo(() => getOpenableItems(person?.Filmography) ?? [], [ person ]);

    useInitialFocus(pageRef, [ person ], !!person);

    const facts = useMemo(() => {
        if (!person) return [];
        const born = formatDate(person.Birthday);
        const died = formatDate(person.Deathday);
        let bornText: string | undefined;
        if (born) bornText = person.PlaceOfBirth ? t('PersonBornIn', born, person.PlaceOfBirth) : t('PersonBorn', born);
        return [ bornText, died ? t('PersonDied', died) : undefined ].filter((value): value is string => !!value);
    }, [ person, t ]);

    if (isPending) return <PersonSkeleton />;

    if (isError || !person) {
        return (
            <div className='pf-status' role='status'>
                <ErrorOutline aria-hidden='true' />
                <p>{t('PersonLoadError')}</p>
            </div>
        );
    }

    if (person.LocalItemId) return <Navigate replace to={getPersonPath(person.LocalItemId)} />;

    return (
        <div ref={pageRef} className='pf-person-page'>
            <header className='pf-person-page__header'>
                <span className='pf-person-page__portrait'>
                    {person.ImageUrl && <img className='pf-person__image' src={person.ImageUrl} alt='' />}
                </span>
                <div>
                    <h1 className='pf-person-page__name'>{person.Name}</h1>
                    {facts.map(fact => <p key={fact} className='pf-person-page__fact'>{fact}</p>)}
                </div>
            </header>

            <section
                className='pf-person-page__filmography'
                aria-labelledby='pf-filmography-title'
                {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}
            >
                <h2 id='pf-filmography-title' className='pf-row__title'>{t('SectionFilmography')}</h2>
                {!titles.length ? <p className='pf-person-page__note'>{t('PersonNoFilmography')}</p> : (
                    <ul className='pf-grid'>
                        {titles.map(title => (
                            <li key={title.Key} className='pf-grid__item'>
                                <CatalogCard item={title} />
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {person.Biography && (
                <section
                    className='pf-about'
                    aria-labelledby='pf-biography-title'
                    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- remote users must reach a section that holds only text
                    tabIndex={0}
                    {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                >
                    <h2 id='pf-biography-title' className='pf-row__title pf-about__title'>{t('SectionBiography')}</h2>
                    <div className='pf-about__body'>
                        <p className='pf-about__overview'>{person.Biography}</p>
                    </div>
                </section>
            )}
        </div>
    );
};

export const Component = () => {
    const { tmdbId } = useParams();
    const id = Number(tmdbId);
    if (!Number.isInteger(id) || id <= 0) return <GridSkeleton />;
    return <TmdbPersonDetails key={id} tmdbId={id} />;
};

Component.displayName = 'PufferfinTmdbPersonPage';
