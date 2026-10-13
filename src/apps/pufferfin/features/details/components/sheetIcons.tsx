import React, { type FC, type ReactNode } from 'react';

/**
 * The drawings of the title sheets: thin strokes on a 24 grid, the size of the
 * text around them.
 */
const SheetIcon: FC<{ children: ReactNode, filled?: boolean, strokeWidth?: number }> = ({ children, filled, strokeWidth = 1.75 }) => (
    <svg
        className='pf-sheet-icon'
        width='1em'
        height='1em'
        viewBox='0 0 24 24'
        fill={filled ? 'currentColor' : 'none'}
        stroke={filled ? 'none' : 'currentColor'}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeLinejoin='round'
        aria-hidden='true'
        focusable='false'
    >
        {children}
    </svg>
);

export const PlayIcon: FC = () => <SheetIcon filled><path d='M7 4.5v15l13-7.5z' /></SheetIcon>;

export const TrailerIcon: FC = () => (
    <SheetIcon>
        <circle cx='12' cy='12' r='9' />
        <path d='M10 8.5v7l5.5-3.5z' />
    </SheetIcon>
);

export const CheckIcon: FC<{ strokeWidth?: number }> = ({ strokeWidth }) => (
    <SheetIcon strokeWidth={strokeWidth}><path d='M5 12.5l4.5 4.5L19 7.5' /></SheetIcon>
);

export const ListIcon: FC<{ filled?: boolean }> = ({ filled }) => (
    <svg
        className='pf-sheet-icon'
        width='1em'
        height='1em'
        viewBox='0 0 24 24'
        fill={filled ? 'currentColor' : 'none'}
        stroke='currentColor'
        strokeWidth={1.75}
        strokeLinecap='round'
        strokeLinejoin='round'
        aria-hidden='true'
        focusable='false'
    >
        <path d='M6 4h12v17l-6-4-6 4z' />
    </svg>
);

export const DownloadIcon: FC = () => (
    <SheetIcon>
        <path d='M12 4v11' />
        <path d='M7 11l5 5 5-5' />
        <path d='M5 20h14' />
    </SheetIcon>
);
