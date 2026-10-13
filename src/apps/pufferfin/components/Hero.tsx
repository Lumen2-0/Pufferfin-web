import classNames from 'classnames';
import React, { type FC, type ReactNode } from 'react';

interface HeroProps {
    /**
     * `full`: the art fills the top of the screen (title sheets).
     * `card`: a large rounded card inside the page margins (Discover).
     * `sheet`: the art over the top of a film or series sheet, the text and
     * the actions at its bottom, the sections starting right below.
     */
    variant?: 'full' | 'card' | 'sheet'
    title: string
    /** Short line above the title, such as the episode number. */
    eyebrow?: string
    /** Facts under the title: year, runtime, rating, genres. */
    meta?: ReactNode
    overview?: string | null
    /** Short tags under the overview, such as the versions of a film: 1080p, 5.1, VF. */
    tags?: string[]
    tagsLabel?: string
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
const Hero: FC<HeroProps> = ({ variant = 'full', title, eyebrow, meta, overview, tags, tagsLabel, backdropUrl, posterUrl, posterShape = 'portrait', actions }) => (
    <section className={classNames('pf-hero', {
        'pf-hero--card': variant === 'card',
        'pf-hero--sheet': variant === 'sheet',
        'pf-hero--poster': !!posterUrl
    })}>
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
                    {!!tags?.length && (
                        <ul className='pf-hero__tags' aria-label={tagsLabel}>
                            {tags.map(tag => <li key={tag} className='pf-hero__tag'>{tag}</li>)}
                        </ul>
                    )}
                    <div className='pf-hero__actions pf-button-row'>{actions}</div>
                </div>
            </div>
        </div>
    </section>
);

export default Hero;
