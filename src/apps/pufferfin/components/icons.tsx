import classNames from 'classnames';
import {
    Activity, ArrowDown, ArrowRight, ArrowUp, Ban, BookOpen, Cast as LucideCast, Check as LucideCheck, ChevronDown, CircleAlert,
    CircleCheck, CircleMinus, Clapperboard, Cloud, CloudOff as LucideCloudOff, Compass, Download as LucideDownload, ExternalLink, Globe, HardDrive, Info,
    KeyRound, Languages, Library, ListVideo, Lock as LucideLock, type LucideIcon, Menu as LucideMenu, Mic as LucideMic, Music,
    Network, Play, Puzzle, RefreshCw, RotateCcw, Search as LucideSearch, SlidersHorizontal, Trash2, TriangleAlert,
    Tv as LucideTv, UserCog, Users, X
} from 'lucide-react';
import React, { type FC, type SVGProps } from 'react';

import './icons.scss';

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

export const ArrowDownward = icon(ArrowDown, 'ArrowDownward');
export const ArrowForward = icon(ArrowRight, 'ArrowForward');
export const ArrowUpward = icon(ArrowUp, 'ArrowUpward');
export const Block = icon(Ban, 'Block');
export const Cast = icon(LucideCast, 'Cast');
export const CastConnected = icon(LucideCast, 'CastConnected', { fill: 'currentColor', fillOpacity: 0.25 });
export const Check = icon(LucideCheck, 'Check');
export const CheckCircle = icon(CircleCheck, 'CheckCircle');
export const Close = icon(X, 'Close');
export const CloudOff = icon(LucideCloudOff, 'CloudOff');
export const CloudOutlined = icon(Cloud, 'CloudOutlined');
export const Delete = icon(Trash2, 'Delete');
export const Download = icon(LucideDownload, 'Download');
export const ErrorOutline = icon(CircleAlert, 'ErrorOutline');
export const ExpandMore = icon(ChevronDown, 'ExpandMore');
export const Explore = icon(Compass, 'Explore');
export const Extension = icon(Puzzle, 'Extension');
export const Groups = icon(Users, 'Groups');
export const Hub = icon(Network, 'Hub');
export const InfoOutlined = icon(Info, 'InfoOutlined');
export const KeyOff = icon(KeyRound, 'KeyOff');
export const Lock = icon(LucideLock, 'Lock');
export const ManageAccounts = icon(UserCog, 'ManageAccounts');
export const Menu = icon(LucideMenu, 'Menu');
export const MenuBook = icon(BookOpen, 'MenuBook');
export const Mic = icon(LucideMic, 'Mic');
export const Movie = icon(Clapperboard, 'Movie');
export const MusicNote = icon(Music, 'MusicNote');
export const NetworkCheck = icon(Activity, 'NetworkCheck');
// Play reads as a solid triangle, as on every player
export const OpenInNew = icon(ExternalLink, 'OpenInNew');
export const PlayArrow = icon(Play, 'PlayArrow', { fill: 'currentColor' });
export const Queue = icon(ListVideo, 'Queue');
export const Refresh = icon(RefreshCw, 'Refresh');
export const RemoveCircleOutline = icon(CircleMinus, 'RemoveCircleOutline');
export const Replay = icon(RotateCcw, 'Replay');
export const Search = icon(LucideSearch, 'Search');
export const Storage = icon(HardDrive, 'Storage');
export const Sync = icon(RefreshCw, 'Sync');
export const TravelExplore = icon(Globe, 'TravelExplore');
export const Translate = icon(Languages, 'Translate');
export const Tune = icon(SlidersHorizontal, 'Tune');
export const Tv = icon(LucideTv, 'Tv');
export const VideoLibrary = icon(Library, 'VideoLibrary');
export const WarningAmber = icon(TriangleAlert, 'WarningAmber');
