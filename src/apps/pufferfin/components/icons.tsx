import classNames from 'classnames';
import { Languages, CircleMinus, CloudOff as LucideCloudOff, type LucideIcon, Play, Shuffle as LucideShuffle } from 'lucide-react';
import React, { type FC, type SVGProps } from 'react';

import './icons.scss';
import { MAJESTIC } from './majesticIcons';

/**
 * The icons of the Pufferfin interface: Lucide drawings, thin strokes. They
 * keep the names of the Material icons they replace and their sizing: 1.5rem
 * by default, the size of the text around with `fontSize='inherit'`.
 */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
    fontSize?: 'inherit' | 'small' | 'medium' | 'large'
}

function icon(Lucide: LucideIcon, name: string, extra: Partial<SVGProps<SVGSVGElement>> = {}): FC<IconProps> {
    const Icon: FC<IconProps> = ({ fontSize = 'medium', className, ...props }) => (
        <Lucide
            size='1em'
            strokeWidth={2}
            absoluteStrokeWidth={false}
            className={classNames('pf-icon', `pf-icon--${fontSize}`, className)}
            focusable='false'
            {...extra}
            {...(props as object)}
        />
    );
    Icon.displayName = name;
    return Icon;
}

function majestic(name: string): FC<IconProps> {
    const Icon: FC<IconProps> = ({ fontSize = 'medium', className, ...props }) => (
        <svg
            viewBox='0 0 24 24'
            fill='none'
            className={classNames('pf-icon', `pf-icon--${fontSize}`, className)}
            focusable='false'
            {...props}
        >
            {MAJESTIC[name].map(([ Tag, attrs ]) => <Tag key={`${Tag}${attrs.d ?? attrs.cx}`} {...attrs} />)}
        </svg>
    );
    Icon.displayName = name;
    return Icon;
}

export const ArrowDownward = majestic('ArrowDownward');
export const ArrowForward = majestic('ArrowForward');
export const ArrowUpward = majestic('ArrowUpward');
export const Block = majestic('Block');
export const Bookmark = majestic('Bookmark');
export const BookmarkFilled = majestic('BookmarkFilled');
export const PhotoCamera = majestic('PhotoCamera');
export const Cast = majestic('Cast');
export const CastConnected = majestic('CastConnected');
export const Check = majestic('Check');
export const CheckCircle = majestic('CheckCircle');
export const Close = majestic('Close');
export const CloudOff = icon(LucideCloudOff, 'CloudOff');
export const CloudOutlined = majestic('CloudOutlined');
export const Delete = majestic('Delete');
export const Download = majestic('Download');
export const ErrorOutline = majestic('ErrorOutline');
export const ExpandMore = majestic('ExpandMore');
export const Explore = majestic('Explore');
export const Extension = majestic('Extension');
export const Groups = majestic('Groups');
export const Hub = majestic('Hub');
export const InfoOutlined = majestic('InfoOutlined');
export const KeyOff = majestic('KeyOff');
export const Lock = majestic('Lock');
export const ManageAccounts = majestic('ManageAccounts');
export const Menu = majestic('Menu');
export const MenuBook = majestic('MenuBook');
export const Mic = majestic('Mic');
export const Movie = majestic('Movie');
export const MusicNote = majestic('MusicNote');
export const NetworkCheck = majestic('NetworkCheck');
// Play reads as a solid triangle, as on every player
export const OpenInNew = majestic('OpenInNew');
export const PlayArrow = icon(Play, 'PlayArrow', { fill: 'currentColor' });
export const Queue = majestic('Queue');
export const Refresh = majestic('Refresh');
export const RemoveCircleOutline = icon(CircleMinus, 'RemoveCircleOutline');
export const Replay = majestic('Replay');
export const Search = majestic('Search');
export const Shuffle = icon(LucideShuffle, 'Shuffle');
export const Storage = majestic('Storage');
export const Sync = majestic('Sync');
export const TravelExplore = majestic('TravelExplore');
export const Translate = icon(Languages, 'Translate');
export const Tune = majestic('Tune');
export const Tv = majestic('Tv');
export const VideoLibrary = majestic('VideoLibrary');
export const WarningAmber = majestic('WarningAmber');
