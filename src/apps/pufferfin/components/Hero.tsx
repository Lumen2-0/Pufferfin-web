import classNames from 'classnames';
import React, { type FC, type ReactNode } from 'react';

interface HeroProps {
    /**
     * `full`: the art fills the top of the screen (title sheets).
     * `card`: a large rounded card inside the page margins (Discover).
     */
    variant?: 'full' | 'card'
    title: string
    /** Short line above the title, such as the episode number. */
    eyebrow?: string
    /** Facts under the title: year, runtime, rating, genres. */
    meta?: ReactNode
    overview?: string | null
    backdropUrl?: string
    /**
     * Cover of a book or an audiobook: shown sharp beside the text, the
     * backdrop being the same image blurred, so a square or portrait cover is
     * never stretched across the screen.
     */
    posterUrl?: string
    posterShape?: 'square' | 'portrait'
    actions: ReactNode
}

/**
 * Featured area: the art is the content, the text sits on a gradient veil so
 * it stays readable on any image.
 */
const Hero: FC<HeroProps> = ({ variant = 'full', title, eyebrow, meta, overview, backdropUrl, posterUrl, posterShape = 'portrait', actions }) => (
    <section className={classNames('pf-hero', { 'pf-hero--card': variant === 'card', 'pf-hero--poster': !!posterUrl })}>
        <div className='pf-hero__frame'>
            {(backdropUrl ?? posterUrl) && (
                <img className='pf-hero__backdrop' src={backdropUrl ?? posterUrl} alt='' />
            )}
            <div className='pf-hero__veil' aria-hidden='true' />
            <div className='pf-hero__content'>
                {posterUrl && (
                    <img className={classNames('pf-hero__poster', `pf-hero__poster--${posterShape}`)} src={posterUrl} alt='' />
                )}
                <div className='pf-hero__text'>
                    {eyebrow && <p className='pf-hero__eyebrow'>{eyebrow}</p>}
                    <h1 className='pf-hero__title'>{title}</h1>
                    {meta ? <div className='pf-hero__meta'>{meta}</div> : null}
                    {overview && <p className='pf-hero__overview'>{overview}</p>}
                    <div className='pf-hero__actions pf-button-row'>{actions}</div>
                </div>
            </div>
        </div>
    </section>
);

export default Hero;
