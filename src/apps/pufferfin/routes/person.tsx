import ErrorOutline from '@mui/icons-material/ErrorOutline';
import React, { type FC, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import { useItem } from 'hooks/useItem';
import datetime from 'scripts/datetime';

import PosterCard from '../components/PosterCard';
import { useFilmography } from '../features/person/api/useFilmography';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE, FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { getCardImageUrl } from '../utils/images';
import { getDisplayTitle } from '../utils/items';
import { useOpenItem } from '../utils/navigation';

const formatDate = (iso: string | null | undefined) => {
    if (!iso) return undefined;
    const date = new Date(iso);
    return isNaN(date.getTime()) ? undefined : datetime.toLocaleDateString(date, { year: 'numeric', month: 'long', day: 'numeric' });
};

const PersonDetails: FC<{ personId: string }> = ({ personId }) => {
    const t = useTranslation();
    const { api } = useApi();
    const openItem = useOpenItem();
    const pageRef = useRef<HTMLDivElement>(null);

    const { data: person, isPending, isError } = useItem(personId);
    const filmography = useFilmography(personId);

    // The first title of the filmography takes the focus once it is there
    useInitialFocus(pageRef, [ person, filmography.isPending ], !!person && !filmography.isPending);

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

    if (isPending) {
        return (
            <div className='pf-status' aria-busy='true'>
                <p>{t('Loading')}</p>
            </div>
        );
    }

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
    if (filmography.isPending) {
        filmographyContent = <p className='pf-person-page__note' aria-busy='true'>{t('Loading')}</p>;
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
