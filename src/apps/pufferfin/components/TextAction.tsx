import React, { type FC, type ReactNode } from 'react';

import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import { OpenInNew } from './icons';

/**
 * A secondary action next to the buttons of a sheet, as plain gray
 * underlined text: a link to another site, or a button that opens a window.
 */
export const TextAction: FC<{ children: ReactNode, onClick: () => void }> = ({ children, onClick }) => (
    <button type='button' className='pf-text-action' onClick={onClick} {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
        {children}
    </button>
);

/** A link that opens another site in a new tab, with the small arrow that says so. */
export const TextLink: FC<{ href: string, children: ReactNode }> = ({ href, children }) => (
    <a className='pf-text-action' href={href} target='_blank' rel='noopener noreferrer' {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
        {children}
        <OpenInNew className='pf-text-action__icon' fontSize='inherit' aria-hidden='true' />
    </a>
);

/** The film on Letterboxd, found by its TMDB id. */
export const getLetterboxdUrl = (tmdbId: number | string) => `https://letterboxd.com/tmdb/${encodeURIComponent(String(tmdbId))}/`;
