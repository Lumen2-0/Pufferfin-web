import React, { type FC, type HTMLAttributes, type PointerEvent, type ReactNode, useCallback, useEffect, useRef } from 'react';

import { useTranslation } from '../i18n/useTranslation';

import './rail.scss';

interface RailProps extends HTMLAttributes<HTMLElement> {
    /** Element of the scroller: a list for cards, a div for a group of buttons. */
    as?: 'ul' | 'div'
    className: string
    children: ReactNode
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/**
 * A row that scrolls sideways, with a slider bar under it: the thumb shows
 * where the row is and how much of it is in view, and drags it. The bar shows
 * when the pointer comes over the row, and only for a row wider than the
 * screen. A mouse affordance: touch screens swipe and a remote moves the
 * focus, so there it never shows.
 */
const Rail: FC<RailProps> = ({ as: Tag = 'ul', className, children, ...props }) => {
    const t = useTranslation();
    const railRef = useRef<HTMLDivElement>(null);
    const scrollerRef = useRef<HTMLElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const scrollFrame = useRef(0);
    const isDragging = useRef(false);

    // The thumb is moved through custom properties: a scroll does not render the component
    const update = useCallback(() => {
        const scroller = scrollerRef.current;
        const rail = railRef.current;
        if (!scroller || !rail) return;
        const max = scroller.scrollWidth - scroller.clientWidth;
        const ratio = scroller.scrollWidth ? scroller.clientWidth / scroller.scrollWidth : 1;
        rail.style.setProperty('--pf-rail-ratio', String(ratio));
        rail.style.setProperty('--pf-rail-progress', String(max > 0 ? clamp(Math.abs(scroller.scrollLeft) / max) : 0));
        rail.toggleAttribute('data-overflow', max > 1);
    }, []);

    // One update per frame while the row scrolls, not one per scroll event
    const onScroll = useCallback(() => {
        if (scrollFrame.current) return;
        scrollFrame.current = requestAnimationFrame(() => {
            scrollFrame.current = 0;
            update();
        });
    }, [ update ]);

    useEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;
        update();
        scroller.addEventListener('scroll', onScroll, { passive: true });
        // A window resize changes the room; the bar is checked again whenever the pointer comes over the row
        window.addEventListener('resize', update);
        return () => {
            scroller.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', update);
            cancelAnimationFrame(scrollFrame.current);
        };
    }, [ update, onScroll ]);

    const moveTo = useCallback((clientX: number) => {
        const scroller = scrollerRef.current;
        const track = trackRef.current;
        if (!scroller || !track) return;
        const box = track.getBoundingClientRect();
        const thumb = (scroller.clientWidth / scroller.scrollWidth) * box.width;
        const fraction = clamp((clientX - box.left - thumb / 2) / (box.width - thumb));
        const max = scroller.scrollWidth - scroller.clientWidth;
        scroller.scrollLeft = (getComputedStyle(scroller).direction === 'rtl' ? -1 : 1) * fraction * max;
    }, []);

    const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
        isDragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        // The stylesheet's smooth scrolling would lag behind the thumb
        scrollerRef.current?.style.setProperty('scroll-behavior', 'auto');
        moveTo(event.clientX);
    }, [ moveTo ]);
    const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
        if (isDragging.current) moveTo(event.clientX);
    }, [ moveTo ]);
    const onPointerEnd = useCallback(() => {
        isDragging.current = false;
        scrollerRef.current?.style.removeProperty('scroll-behavior');
    }, []);

    return (
        <div ref={railRef} className='pf-rail' onPointerEnter={update}>
            <Tag ref={scrollerRef as never} className={className} {...props}>
                {children}
            </Tag>
            {/* Out of the tab order: the keyboard and the remote move through the cards themselves */}
            <div
                ref={trackRef}
                className='pf-rail__track'
                role='scrollbar'
                aria-orientation='horizontal'
                aria-controls={undefined}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={0}
                aria-label={t('ActionScrollRow')}
                tabIndex={-1}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
            >
                <div className='pf-rail__thumb' />
            </div>
        </div>
    );
};

export default Rail;
