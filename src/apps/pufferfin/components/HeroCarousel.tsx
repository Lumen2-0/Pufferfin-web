import classNames from 'classnames';
import React, { type FC, type PointerEvent, type ReactNode, useCallback, useRef, useState } from 'react';

import { useTranslation } from '../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE, FOCUSABLE_ATTRIBUTE } from '../navigation/focus';

/** One title of the carousel: its art, its words and its buttons. */
export interface HeroSlide {
    key: string
    title: string
    eyebrow?: string
    overview?: string | null
    backdropUrl: string
    actions: ReactNode
}

/** A horizontal drag longer than this changes the slide. */
const SWIPE_PX = 48;

interface DotProps {
    index: number
    count: number
    isActive: boolean
    onSelect: (index: number) => void
    /** Called when the active dot has filled up: time for the next title. */
    onDone: () => void
}

/**
 * One dot per title. The active one stretches into a small capsule that fills
 * up while its title shows; when it is full, the next title comes. The fill
 * pauses with the carousel, so the time left is never lost.
 */
const Dot: FC<DotProps> = ({ index, count, isActive, onSelect, onDone }) => {
    const t = useTranslation();
    const onClick = useCallback(() => onSelect(index), [ index, onSelect ]);
    return (
        <button
            type='button'
            className={classNames('pf-carousel__dot', { 'pf-carousel__dot--active': isActive })}
            aria-label={t('CarouselSlide', index + 1, count)}
            aria-current={isActive || undefined}
            onClick={onClick}
            {...{ [FOCUSABLE_ATTRIBUTE]: true }}
        >
            {isActive && <span className='pf-carousel__dot-fill' onAnimationEnd={onDone} />}
        </button>
    );
};

// When a key was last pressed, reset by a pointer: only a key pressed while the carousel is
// shown lets a focus on it hold it, not the Enter that signed in or the focus put on load
let lastKeyAt = 0;
if (typeof window !== 'undefined') {
    window.addEventListener('keydown', () => {
        lastKeyAt = Date.now();
    }, true);
    window.addEventListener('pointerdown', () => {
        lastKeyAt = 0;
    }, true);
}

/**
 * The featured titles of Discover, one screen high: a large card whose art
 * fades from one title to the next. It moves on by itself, also under the
 * pointer, and stops while the keyboard or the remote focus is on it. Dots and a swipe move by hand.
 */
const HeroCarousel: FC<{ slides: HeroSlide[] }> = ({ slides }) => {
    const t = useTranslation();
    const [ index, setIndex ] = useState(0);
    const [ isHeld, setIsHeld ] = useState(false);
    const dragStart = useRef<number>();
    const count = slides.length;
    const active = slides[Math.min(index, count - 1)];

    // Moves on when the dot of the title has filled up (see the style sheet): it
    // pauses while held, and never runs when the user asked for less motion
    const next = useCallback(() => setIndex(current => (current + 1) % count), [ count ]);

    // Only the keyboard and the remote hold it: under the mouse it keeps turning, and the focus
    // the page itself puts on the hero when it opens is no reason to stop either
    const mountedAt = useRef(Date.now());
    const holdForKeyboard = useCallback(() => {
        if (lastKeyAt > mountedAt.current || document.documentElement.classList.contains('layout-tv')) setIsHeld(true);
    }, []);
    const onBlur = useCallback((event: React.FocusEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsHeld(false);
    }, []);

    const onPointerDown = useCallback((event: PointerEvent) => {
        dragStart.current = event.clientX;
    }, []);
    const onPointerUp = useCallback((event: PointerEvent) => {
        const start = dragStart.current;
        dragStart.current = undefined;
        if (start === undefined || count < 2) return;
        const distance = event.clientX - start;
        if (Math.abs(distance) < SWIPE_PX) return;
        setIndex(current => (current + (distance < 0 ? 1 : count - 1)) % count);
    }, [ count ]);

    if (!active) return null;

    return (
        <section
            className={classNames('pf-hero pf-hero--card pf-hero--viewport pf-carousel', { 'pf-carousel--held': isHeld })}
            aria-roledescription='carousel'
            aria-label={t('CarouselLabel')}
            onFocus={holdForKeyboard}
            onBlur={onBlur}
        >
            <div className='pf-hero__frame' onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
                {slides.map((slide, slideIndex) => (
                    <img
                        key={slide.key}
                        className={classNames('pf-hero__backdrop', 'pf-carousel__backdrop', {
                            'pf-carousel__backdrop--active': slideIndex === index
                        })}
                        src={slide.backdropUrl}
                        alt=''
                        // The art of the next slides loads after the first one
                        loading={slideIndex === 0 ? 'eager' : 'lazy'}
                        draggable={false}
                    />
                ))}
                <div className='pf-hero__veil' aria-hidden='true' />
                <div className='pf-hero__content'>
                    <div key={active.key} className='pf-hero__text pf-carousel__text' aria-live={isHeld ? 'polite' : 'off'}>
                        {active.eyebrow && <p className='pf-hero__eyebrow'>{active.eyebrow}</p>}
                        <h2 className='pf-hero__title'>{active.title}</h2>
                        {active.overview && <p className='pf-hero__overview'>{active.overview}</p>}
                        <div className='pf-hero__actions pf-button-row'>{active.actions}</div>
                    </div>
                </div>
                {count > 1 && (
                    <div className='pf-carousel__dots' {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}>
                        {slides.map((slide, slideIndex) => (
                            <Dot
                                key={slide.key}
                                index={slideIndex}
                                count={count}
                                isActive={slideIndex === index}
                                onSelect={setIndex}
                                onDone={next}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default HeroCarousel;
