import React, { type FC, type ReactNode } from 'react';

interface HeroProps {
    title: string
    /** Short line above the title, such as the episode number. */
    eyebrow?: string
    overview?: string | null
    backdropUrl?: string
    actions: ReactNode
}

/**
 * Full screen featured area: the art is the content, the text sits on a
 * gradient veil so it stays readable on any image.
 */
const Hero: FC<HeroProps> = ({ title, eyebrow, overview, backdropUrl, actions }) => (
    <section className='pf-hero'>
        {backdropUrl && (
            <img className='pf-hero__backdrop' src={backdropUrl} alt='' />
        )}
        <div className='pf-hero__veil' aria-hidden='true' />
        <div className='pf-hero__content'>
            {eyebrow && <p className='pf-hero__eyebrow'>{eyebrow}</p>}
            <h1 className='pf-hero__title'>{title}</h1>
            {overview && <p className='pf-hero__overview'>{overview}</p>}
            <div className='pf-hero__actions'>{actions}</div>
        </div>
    </section>
);

export default Hero;
