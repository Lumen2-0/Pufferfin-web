import classNames from 'classnames';
import React, { type CSSProperties, type FC, type ReactNode } from 'react';

import { useTranslation } from '../i18n/useTranslation';
import type { CardShape } from '../utils/images';

/**
 * Placeholders in the shape of what is loading: the page keeps its layout
 * while it fills in, nothing jumps when the content lands. A soft light runs
 * across them; with reduced motion they stay still.
 */

/** One placeholder block. Sizes are CSS lengths. */
export const Bone: FC<{ className?: string, width?: string, height?: string, style?: CSSProperties }> = ({ className, width, height, style }) => (
    <span className={classNames('pf-bone', className)} style={{ width, height, ...style }} aria-hidden='true' />
);

/** Lines of text, the last one shorter, as a paragraph would end. */
export const BoneLines: FC<{ count: number, className?: string }> = ({ count, className }) => (
    <span className={classNames('pf-bone-lines', className)} aria-hidden='true'>
        {Array.from({ length: count }, (_, index) => (
            <Bone key={index} className='pf-bone--line' width={index === count - 1 && count > 1 ? '62%' : '100%'} />
        ))}
    </span>
);

/** The frame of every skeleton: announced once as loading, hidden otherwise from assistive technologies. */
export const SkeletonRegion: FC<{ className?: string, children: ReactNode }> = ({ className, children }) => {
    const t = useTranslation();
    return (
        <div className={classNames('pf-skeleton', className)} role='status' aria-busy='true'>
            <span className='pf-visually-hidden'>{t('Loading')}</span>
            {children}
        </div>
    );
};

/** One card: its art, then its title and subtitle. */
export const CardBone: FC<{ shape: CardShape, withCaption?: boolean }> = ({ shape, withCaption = true }) => (
    <span className={classNames('pf-card', `pf-card--${shape}`, 'pf-card--skeleton')} aria-hidden='true'>
        <Bone className='pf-card__art pf-bone--art' />
        {withCaption && (
            <span className='pf-card-bone__caption'>
                <Bone className='pf-bone--line' width='80%' />
                <Bone className='pf-bone--line pf-bone--small' width='45%' />
            </span>
        )}
    </span>
);

const ROW_CARDS = 8;

/** A row of cards with its title, inside a page whose rows are loading. */
export const RowBone: FC<{ shape?: CardShape, count?: number }> = ({ shape = 'portrait', count = ROW_CARDS }) => (
    <div className='pf-row pf-row--skeleton' aria-hidden='true'>
        <span className='pf-row__title'><Bone className='pf-bone--heading' width='11rem' /></span>
        <ul className='pf-row__list'>
            {Array.from({ length: count }, (_, index) => <li key={index}><CardBone shape={shape} withCaption={false} /></li>)}
        </ul>
    </div>
);

/** A grid of cards, as a library or a filmography lists them. */
export const GridSkeleton: FC<{ count?: number }> = ({ count = 18 }) => (
    <SkeletonRegion>
        <ul className='pf-grid'>
            {Array.from({ length: count }, (_, index) => (
                <li key={index} className='pf-grid__item'><CardBone shape='portrait' /></li>
            ))}
        </ul>
    </SkeletonRegion>
);

/** The opening of a sheet: the art over the whole screen, the title, the facts, the buttons, then rows. */
export const DetailsSkeleton: FC<{ withPoster?: boolean }> = ({ withPoster }) => (
    <SkeletonRegion className='pf-details'>
        <div className='pf-hero pf-hero--skeleton'>
            <div className='pf-hero__frame'>
                <Bone className='pf-hero__backdrop pf-bone--backdrop' />
                <div className='pf-hero__content'>
                    {withPoster && <Bone className='pf-hero__poster pf-hero__poster--portrait' />}
                    <div className='pf-hero__text pf-hero-bone__text'>
                        <Bone className='pf-bone--title' width='min(26rem, 80%)' />
                        <Bone className='pf-bone--line' width='14rem' />
                        <BoneLines count={3} className='pf-hero-bone__overview' />
                        <span className='pf-hero-bone__actions'>
                            <Bone className='pf-bone--button' width='8rem' />
                            <Bone className='pf-bone--button' width='7rem' />
                        </span>
                    </div>
                </div>
            </div>
        </div>
        <RowBone />
    </SkeletonRegion>
);

/** The featured carousel of Discover, until its first title is known. */
export const CarouselSkeleton: FC = () => (
    <SkeletonRegion className='pf-hero pf-hero--card pf-hero--viewport pf-hero--skeleton'>
        <div className='pf-hero__frame'>
            <div className='pf-hero__content'>
                <div className='pf-hero__text pf-hero-bone__text'>
                    <Bone className='pf-bone--line pf-bone--small' width='5rem' />
                    <Bone className='pf-bone--title' width='min(24rem, 75%)' />
                    <BoneLines count={2} className='pf-hero-bone__overview' />
                    <span className='pf-hero-bone__actions'>
                        <Bone className='pf-bone--button' width='9rem' />
                    </span>
                </div>
            </div>
        </div>
    </SkeletonRegion>
);

/** The page of an audiobook: the cover, the title, Play, then the parts as tracks. */
export const AlbumSkeleton: FC = () => (
    <SkeletonRegion className='pf-album'>
        <div className='pf-album__header'>
            <Bone className='pf-album__cover' />
            <div className='pf-album__text pf-album-bone__text'>
                <Bone className='pf-bone--title' width='min(22rem, 70vw)' />
                <Bone className='pf-bone--line' width='10rem' />
                <Bone className='pf-bone--line pf-bone--small' width='14rem' />
                <Bone className='pf-bone--button pf-album-bone__button' width='9rem' />
            </div>
        </div>
        <div className='pf-album__parts'>
            <Bone className='pf-bone--heading' width='6rem' />
            <ol className='pf-tracks'>
                {Array.from({ length: 8 }, (_, index) => (
                    <li key={index} className='pf-tracks__item'>
                        <span className='pf-tracks__row pf-tracks-bone'>
                            <Bone className='pf-tracks-bone__number' />
                            <Bone className='pf-bone--line' width={`${40 + ((index * 17) % 35)}%`} />
                            <Bone className='pf-bone--line pf-tracks-bone__length' width='3rem' />
                        </span>
                    </li>
                ))}
            </ol>
        </div>
    </SkeletonRegion>
);

/** The page of a person: the round portrait, the name, the facts, then the filmography. */
export const PersonSkeleton: FC = () => (
    <SkeletonRegion className='pf-person-page'>
        <div className='pf-person-page__header'>
            <Bone className='pf-person-page__portrait' />
            <div className='pf-person-bone__text'>
                <Bone className='pf-bone--title' width='16rem' />
                <Bone className='pf-bone--line' width='12rem' />
            </div>
        </div>
        <div className='pf-person-page__filmography'>
            <span className='pf-row__title'><Bone className='pf-bone--heading' width='9rem' /></span>
            <ul className='pf-grid'>
                {Array.from({ length: 12 }, (_, index) => (
                    <li key={index} className='pf-grid__item'><CardBone shape='portrait' /></li>
                ))}
            </ul>
        </div>
    </SkeletonRegion>
);

/** The downloads page: wide cards, art on the left, words and a bar in the middle. */
export const DownloadsSkeleton: FC = () => (
    <SkeletonRegion>
        <ul className='pf-downloads__list'>
            {Array.from({ length: 4 }, (_, index) => (
                <li key={index} className='pf-download pf-download--skeleton'>
                    <Bone className='pf-download__art' />
                    <span className='pf-download__body'>
                        <Bone className='pf-bone--line' width='55%' />
                        <Bone className='pf-bone--line pf-bone--small' width='25%' />
                        <Bone className='pf-download-bone__track' />
                    </span>
                    <Bone className='pf-bone--round' />
                </li>
            ))}
        </ul>
    </SkeletonRegion>
);

/** A list of capsules, as the menu lists the libraries. */
export const CapsulesSkeleton: FC<{ count?: number }> = ({ count = 4 }) => (
    <SkeletonRegion>
        <ul className='pf-menu__list'>
            {Array.from({ length: count }, (_, index) => (
                <li key={index} className='pf-menu__item'>
                    <Bone className='pf-bone--button' width={`${6 + ((index * 3) % 5)}rem`} />
                </li>
            ))}
        </ul>
    </SkeletonRegion>
);

/** Episodes airing soon, a list of wide tiles. */
export const TilesSkeleton: FC<{ count?: number }> = ({ count = 6 }) => (
    <SkeletonRegion>
        <ul className='pf-grid'>
            {Array.from({ length: count }, (_, index) => (
                <li key={index} className='pf-grid__item'><CardBone shape='landscape' /></li>
            ))}
        </ul>
    </SkeletonRegion>
);
