import React, { type FC, Fragment } from 'react';
import { Link } from 'react-router-dom';

import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';

export interface CreditLink {
    key: string
    name: string
    /** The page of the person, with every title of theirs. */
    path: string
}

/**
 * "Directed by Christopher Nolan" under the facts of a sheet: each name opens
 * the page of the person, with all their films.
 */
const CreditLine: FC<{ label: string, people: CreditLink[] }> = ({ label, people }) => {
    if (!people.length) return null;
    return (
        <p className='pf-hero__credit'>
            <span className='pf-hero__credit-label'>{label}</span>
            {people.map((person, index) => (
                <Fragment key={person.key}>
                    {index > 0 && <span className='pf-hero__credit-separator'>, </span>}
                    <Link to={person.path} className='pf-hero__credit-link' {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                        {person.name}
                    </Link>
                </Fragment>
            ))}
        </p>
    );
};

export default CreditLine;

/** The facts line of a sheet (year, length, genres), then who made the title. Nothing when both are empty. */
export const HeroFacts: FC<{ meta: string[], label: string, people: CreditLink[] }> = ({ meta, label, people }) => {
    if (!meta.length && !people.length) return null;
    return (
        <>
            {meta.length > 0 && (
                <ul className='pf-meta'>
                    {meta.map(value => <li key={value} className='pf-meta__item'>{value}</li>)}
                </ul>
            )}
            <CreditLine label={label} people={people} />
        </>
    );
};
