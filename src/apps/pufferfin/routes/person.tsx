import React, { type FC, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import { useItem } from 'hooks/useItem';
import datetime from 'scripts/datetime';

import CatalogCard from '../components/CatalogCard';
import PosterCard from '../components/PosterCard';
import { useCatalogPerson } from '../features/catalog/api/useCatalog';
import { getOpenableItems } from '../features/catalog/utils/catalog';
import { useFilmography } from '../features/person/api/useFilmography';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE, FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { getCardImageUrl } from '../utils/images';
import { getDisplayTitle } from '../utils/items';
import { useOpenItem } from '../utils/navigation';
import { GridSkeleton, PersonSkeleton } from '../components/Skeleton';
import { isPlayableItem } from '../utils/playback';
import { usePlayItem } from '../utils/usePlay';
import { ErrorOutline } from '../components/icons';

const formatDate = (iso: string | null | undefined) => {
    if (!iso) return undefined;
    const date = new Date(iso);
    return isNaN(date.getTime()) ? undefined : datetime.toLocaleDateString(date, { year: 'numeric', month: 'long', day: 'numeric' });
};

const PersonDetails: FC<{ personId: string }> = ({ personId }) => {
    const t = useTranslation();
    const { api } = useApi();
    const openItem = useOpenItem();
    const playCard = usePlayItem();
    const pageRef = useRef<HTMLDivElement>(null);

    const { data: person, isPending, isError } = useItem(personId);
    // The whole filmography comes from TMDB, each title on disk or not; the library one stands in without TMDB
    const tmdbId = Number(person?.ProviderIds?.Tmdb) || undefined;
    const catalogPerson = useCatalogPerson(tmdbId);
    const hasCatalog = !!tmdbId && !catalogPerson.isError;
    const filmography = useFilmography(person && !hasCatalog ? personId : undefined);
    const catalogTitles = useMemo(() => getOpenableItems(catalogPerson.data?.Filmography) ?? [], [ catalogPerson.data ]);
    const isFilmographyPending = hasCatalog ? catalogPerson.isPending : filmography.isPending;

    // The first title of the filmography takes the focus once it is there
    useInitialFocus(pageRef, [ person, isFilmographyPending ], !!person && !isFilmographyPending);

    const lifeFacts = useMemo(() => {
        if (!person) return [];
        const born = formatDate(person.PremiereDate);
        const place = person.ProductionLocations?.[0];
        const died = formatDate(person.EndDate);
        let bornText: string | undefined;
        if (born) bornText = place ? t('PersonBornIn', born, place) : t('PersonBorn', born);
        return [ bornText, died ? t('PersonDied', died) : undefined ]
            .filter((value): value is string => !!value);
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

    const portraitUrl = api ? getCardImageUrl(api, person, 'portrait') : undefined;

    let filmographyContent: React.ReactNode;
    if (isFilmographyPending) {
        filmographyContent = <GridSkeleton count={12} />;
    } else if (hasCatalog) {
        filmographyContent = catalogTitles.length ? (
            <ul className='pf-grid'>
                {catalogTitles.map(title => (
                    <li key={title.Key} className='pf-grid__item'>
                        <CatalogCard item={title} />
                    </li>
                ))}
            </ul>
        ) : <p className='pf-person-page__note'>{t('PersonNoFilmography')}</p>;
    } else if (filmography.isError) {
        filmographyContent = (
            <p className='pf-row__error' role='status'>
                <ErrorOutline aria-hidden='true' />
                {t('RowLoadError')}
            </p>
        );
    } else if (!filmography.data?.length) {
        filmographyContent = <p className='pf-person-page__note'>{t('PersonNoTitles')}</p>;
    } else {
        filmographyContent = (
            <ul className='pf-grid'>
                {filmography.data.map(title => (
                    <li key={title.Id ?? ''} className='pf-grid__item'>
                        <PosterCard
                            title={getDisplayTitle(title)}
                            subtitle={title.ProductionYear ? String(title.ProductionYear) : undefined}
                            imageUrl={api ? getCardImageUrl(api, title, 'portrait') : undefined}
                            shape='portrait'
                            value={title}
                            onSelect={openItem}
                            onPlay={isPlayableItem(title) ? playCard : undefined}
                        />
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <div ref={pageRef} className='pf-person-page'>
            <header className='pf-person-page__header'>
                <span className='pf-person-page__portrait'>
                    {portraitUrl && <img className='pf-person__image' src={portraitUrl} alt='' />}
                </span>
                <div>
                    <h1 className='pf-person-page__name'>{person.Name}</h1>
                    {lifeFacts.map(fact => <p key={fact} className='pf-person-page__fact'>{fact}</p>)}
                </div>
            </header>

            <section
                className='pf-person-page__filmography'
                aria-labelledby='pf-filmography-title'
                {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}
            >
                <h2 id='pf-filmography-title' className='pf-row__title'>{t('SectionFilmography')}</h2>
                {filmographyContent}
            </section>

            {person.Overview && (
                // Focusable as a whole: it holds no control, and the remote must still reach it
                <section
                    className='pf-about'
                    aria-labelledby='pf-biography-title'
                    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- remote users must reach a section that holds only text
                    tabIndex={0}
                    {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                >
                    <h2 id='pf-biography-title' className='pf-row__title pf-about__title'>{t('SectionBiography')}</h2>
                    <div className='pf-about__body'>
                        <p className='pf-about__overview'>{person.Overview}</p>
                    </div>
                </section>
            )}
        </div>
    );
};

export const Component = () => {
    const { personId } = useParams();
    // Keyed by id: going from one person to another starts from a clean page state
    return personId ? <PersonDetails key={personId} personId={personId} /> : null;
};

Component.displayName = 'PufferfinPersonPage';
