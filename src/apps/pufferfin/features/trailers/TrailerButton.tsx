import React, { type FC, useCallback, useState } from 'react';

import Modal from '../../components/Modal';
import RoundButton from '../../components/RoundButton';
import { Movie } from '../../components/icons';
import { TrailerIcon } from '../details/components/sheetIcons';
import { useTranslation } from '../../i18n/useTranslation';
import type { CatalogVideo } from '../catalog/api/types';

/** The YouTube trailer to show: an official trailer first, then any trailer, then a teaser; the server lists the preferred language first. */
export function pickTrailer(videos: CatalogVideo[] | undefined): CatalogVideo | undefined {
    const youtube = (videos ?? []).filter(video => video.Site === 'YouTube' && !!video.Key);
    return youtube.find(video => video.Type === 'Trailer' && video.Official)
        ?? youtube.find(video => video.Type === 'Trailer')
        ?? youtube[0];
}

/** The privacy-enhanced YouTube player: no cookie until the video plays. */
export const getTrailerEmbedUrl = (key: string) =>
    `https://www.youtube-nocookie.com/embed/${encodeURIComponent(key)}?autoplay=1&rel=0&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`;

/**
 * Trailer button of a title not on disk yet: the trailer plays in a window
 * over the sheet, before anything is downloaded. Nothing shows without one.
 */
const TrailerButton: FC<{ videos: CatalogVideo[] | undefined, title: string }> = ({ videos, title }) => {
    const t = useTranslation();
    const [ isOpen, setIsOpen ] = useState(false);
    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const trailer = pickTrailer(videos);

    if (!trailer?.Key) return null;

    return (
        <>
            <RoundButton icon={<TrailerIcon />} label={t('ActionTrailer')} onClick={open} />
            {isOpen && (
                <Modal title={title} icon={<Movie fontSize='inherit' />} onClose={close} className='pf-trailer'>
                    <div className='pf-trailer__frame'>
                        <iframe
                            src={getTrailerEmbedUrl(trailer.Key)}
                            title={trailer.Name ?? t('ActionTrailer')}
                            allow='autoplay; encrypted-media; fullscreen; picture-in-picture'
                            // The page sends no referrer; YouTube refuses to play without one (error 153)
                            referrerPolicy='strict-origin-when-cross-origin'
                            allowFullScreen
                        />
                    </div>
                </Modal>
            )}
        </>
    );
};

export default TrailerButton;
