import classNames from 'classnames';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { type FC, type HTMLAttributes, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { useTranslation } from '../i18n/useTranslation';
import { getRailState, getRailStep, type RailState } from './railMetrics';

import './rail.scss';

interface RailProps extends HTMLAttributes<HTMLElement> {
    /** Element of the scroller: a list for cards, a div for a group of buttons. */
    as?: 'ul' | 'div'
    className: string
    children: ReactNode
}

const NO_SCROLL: RailState = { canPrevious: false, canNext: false };

/**
 * A row that scrolls sideways, with a round arrow at each edge. The arrows show
 * when the pointer comes over the row, and only the ones with somewhere to go:
 * no left arrow before the row has scrolled. A mouse affordance: touch screens
 * swipe and a remote moves the focus, so there they never show.
 */
const Rail: FC<RailProps> = ({ as: Tag = 'ul', className, children, ...props }) => {
    const t = useTranslation();
    const scrollerRef = useRef<HTMLElement>(null);
    const [ state, setState ] = useState<RailState>(NO_SCROLL);

    const update = useCallback(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;
        const next = getRailState(scroller);
        setState(previous => (
            previous.canPrevious === next.canPrevious && previous.canNext === next.canNext ? previous : next
        ));
    }, []);

    useEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;
        update();
        scroller.addEventListener('scroll', update, { passive: true });
        // A window resize changes the room; the arrows are checked again whenever the pointer comes over the row
        window.addEventListener('resize', update);
        return () => {
            scroller.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, [ update ]);

    const scroll = useCallback((direction: 1 | -1) => {
        const scroller = scrollerRef.current;
        if (!scroller) return;
        const isRtl = getComputedStyle(scroller).direction === 'rtl';
        scroller.scrollBy({ left: getRailStep(scroller.clientWidth, direction, isRtl), behavior: 'smooth' });
    }, []);
    const scrollPrevious = useCallback(() => scroll(-1), [ scroll ]);
    const scrollNext = useCallback(() => scroll(1), [ scroll ]);

    return (
        <div className='pf-rail' onPointerEnter={update}>
            <Tag ref={scrollerRef as never} className={className} {...props}>
                {children}
            </Tag>
            {/* Out of the tab order: the keyboard and the remote move through the cards themselves */}
            <button
                type='button'
                className={classNames('pf-rail__arrow', 'pf-rail__arrow--previous', { 'pf-rail__arrow--off': !state.canPrevious })}
                aria-label={t('ActionScrollPrevious')}
                tabIndex={-1}
                onClick={scrollPrevious}
            >
                <ChevronLeft aria-hidden='true' focusable='false' size='1.125rem' strokeWidth={2} />
            </button>
            <button
                type='button'
                className={classNames('pf-rail__arrow', 'pf-rail__arrow--next', { 'pf-rail__arrow--off': !state.canNext })}
                aria-label={t('ActionScrollNext')}
                tabIndex={-1}
                onClick={scrollNext}
            >
                <ChevronRight aria-hidden='true' focusable='false' size='1.125rem' strokeWidth={2} />
            </button>
        </div>
    );
};

export default Rail;
