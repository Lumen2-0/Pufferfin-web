import classNames from 'classnames';
import React, { type FC, type MouseEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useCatalogTitle } from '../catalog/api/useCatalog';
import type { CatalogTitleKind } from '../../routes/paths';
import { pickTrailer } from './TrailerButton';

const COUNTDOWN_SECONDS = 5;
// A little more than the 600ms the panel takes to shrink back
const CLOSE_MS = 650;
const VOLUME = 10;
const YOUTUBE_ORIGIN = 'https://www.youtube-nocookie.com';

const getEmbedUrl = (key: string) =>
    `https://www.youtube-nocookie.com/embed/${encodeURIComponent(key)}?autoplay=1&mute=1&controls=0&disablekb=1&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=${encodeURIComponent(key)}&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;

interface CardTrailerPreviewProps {
    kind: CatalogTitleKind
    tmdbId: number
    imageUrl?: string
    onOpen: () => void
    children: ReactNode
}

/**
 * After 5 seconds under the pointer, the card opens as a wider panel playing
 * its trailer at 10% volume. Leaving the card or the panel closes it.
 */
const CardTrailerPreview: FC<CardTrailerPreviewProps> = ({ kind, tmdbId, imageUrl, onOpen, children }) => {
    const [ isHovered, setIsHovered ] = useState(false);
    const [ remaining, setRemaining ] = useState(COUNTDOWN_SECONDS);
    const [ isOpen, setIsOpen ] = useState(false);
    const [ isExpanded, setIsExpanded ] = useState(false);
    const [ isClosing, setIsClosing ] = useState(false);
    const closeTimer = useRef(0);
    const cardRect = useRef<DOMRect>();
    const cardElement = useRef<HTMLElement | null>(null);
    // The countdown goes in the layer of the card buttons, so it lines up with them
    const buttonLayer = useRef<Element | null>(null);
    const frame = useRef<HTMLIFrameElement>(null);
    const title = useCatalogTitle(kind, tmdbId, isHovered);
    const key = pickTrailer(title.data?.Trailers)?.Key;

    const onEnter = useCallback((event: MouseEvent<HTMLElement>) => {
        // Back on the card while the panel still shrinks: it goes at once, the countdown starts again
        window.clearTimeout(closeTimer.current);
        setIsOpen(false);
        setIsClosing(false);
        cardRect.current = event.currentTarget.querySelector('.pf-card__art')?.getBoundingClientRect();
        // Not the art: it clips what overflows, and the panel grows past it
        buttonLayer.current = event.currentTarget.querySelector('.pf-card-play__zone');
        cardElement.current = event.currentTarget.querySelector('.pf-card-play');
        setIsHovered(true);
    }, []);
    // The panel shrinks back onto the poster, the video fades out, then it leaves
    const onLeave = useCallback(() => {
        setIsHovered(false);
        setIsExpanded(false);
        setRemaining(COUNTDOWN_SECONDS);
        setIsClosing(true);
        frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'mute', args: [] }), YOUTUBE_ORIGIN);
        window.clearTimeout(closeTimer.current);
        closeTimer.current = window.setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
        }, CLOSE_MS);
    }, []);

    useEffect(() => () => window.clearTimeout(closeTimer.current), []);

    useEffect(() => {
        if (!isHovered || !key || !cardRect.current) return;
        const timer = window.setInterval(() => setRemaining(value => value - 1), 1000);
        return () => window.clearInterval(timer);
    }, [ isHovered, key ]);

    useEffect(() => {
        if (remaining <= 0) setIsOpen(true);
    }, [ remaining ]);

    // The panel mounts at the size of the card, the poster in it; it grows once the player has loaded,
    // so the loading does not stutter the animation
    const expand = useCallback(() => requestAnimationFrame(() => setIsExpanded(true)), []);

    // Same height as the card, 16:9 wide: the card makes room on its right, pushing the next ones along the row
    useEffect(() => {
        const element = cardElement.current;
        const rect = cardRect.current;
        if (!isExpanded || !element || !rect) return;
        element.style.marginRight = `${rect.height * 16 / 9 - rect.width}px`;
        element.classList.add('pf-card-play--previewing');
        const reveal = window.setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }), 650);
        return () => {
            window.clearTimeout(reveal);
            element.style.marginRight = '';
            element.classList.remove('pf-card-play--previewing');
        };
    }, [ isExpanded ]);

    // The player starts muted, so autoplay is never refused. Once it answers, it gets its sound back at 10%
    useEffect(() => {
        if (!isOpen) return;
        const post = (message: object) => frame.current?.contentWindow?.postMessage(JSON.stringify(message), YOUTUBE_ORIGIN);
        const listen = window.setInterval(() => post({ event: 'listening' }), 250);
        const onMessage = (event: MessageEvent) => {
            if (event.source as Window | null !== frame.current?.contentWindow) return;
            window.clearInterval(listen);
            window.removeEventListener('message', onMessage);
            post({ event: 'command', func: 'setVolume', args: [ VOLUME ] });
            post({ event: 'command', func: 'unMute', args: [] });
        };
        window.addEventListener('message', onMessage);
        return () => {
            window.clearInterval(listen);
            window.removeEventListener('message', onMessage);
        };
    }, [ isOpen ]);

    const card = cardRect.current;
    const target = card && { width: card.height * 16 / 9 };
    const from = card && { width: card.width };
    const layer = buttonLayer.current;

    return (
        <span className='pf-card-preview' onMouseEnter={onEnter} onMouseLeave={onLeave}>
            {children}
            {isHovered && key && layer && !isOpen && remaining > 0 && createPortal(
                <span className='pf-card-preview__count' aria-hidden='true'>
                    <svg className='pf-card-preview__svg' viewBox='0 0 32 32'>
                        <circle className='pf-card-preview__ring' cx='16' cy='16' r='14' pathLength='1' />
                    </svg>
                    <span>{remaining}</span>
                </span>,
                layer
            )}
            {isOpen && key && layer && target && from && createPortal(
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                <div className={classNames('pf-card-preview__panel', { 'pf-card-preview__panel--open': isExpanded, 'pf-card-preview__panel--closing': isClosing })} style={isExpanded ? target : from} onClick={onOpen}>
                    {imageUrl && <img src={imageUrl} alt='' style={{ width: from.width }} />}
                    <iframe
                        ref={frame}
                        src={getEmbedUrl(key)}
                        title={title.data?.Title}
                        allow='autoplay; encrypted-media'
                        referrerPolicy='strict-origin-when-cross-origin'
                        onLoad={expand}
                    />
                </div>,
                layer
            )}
        </span>
    );
};

export default CardTrailerPreview;
