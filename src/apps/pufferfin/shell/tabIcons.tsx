import React, { type FC, type ReactNode } from 'react';

// Line icons of the bottom bar, drawn as in the mobile mockups: 24 units, 1.75 stroke
const TabIcon: FC<{ children: ReactNode }> = ({ children }) => (
    <svg
        className='pf-tabbar__svg'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.75'
        strokeLinecap='round'
        strokeLinejoin='round'
        aria-hidden='true'
        focusable='false'
    >
        {children}
    </svg>
);

export const DiscoverIcon: FC = () => (
    <TabIcon>
        <circle cx='12' cy='12' r='9' />
        <path d='M15.5 8.5l-2 5-5 2 2-5z' />
    </TabIcon>
);

export const LibraryIcon: FC = () => (
    <TabIcon>
        <rect x='4' y='4' width='4' height='16' rx='1' />
        <rect x='10' y='4' width='4' height='16' rx='1' />
        <path d='M16.5 5.5l3.5 1-3.5 13-3.5-1z' />
    </TabIcon>
);

export const ExploreIcon: FC = () => (
    <TabIcon>
        <rect x='4' y='4' width='7' height='7' rx='1.5' />
        <rect x='13' y='4' width='7' height='7' rx='1.5' />
        <rect x='4' y='13' width='7' height='7' rx='1.5' />
        <rect x='13' y='13' width='7' height='7' rx='1.5' />
    </TabIcon>
);

export const SearchIcon: FC = () => (
    <TabIcon>
        <circle cx='11' cy='11' r='7' />
        <path d='M20 20l-3.5-3.5' />
    </TabIcon>
);

export const DownloadsIcon: FC = () => (
    <TabIcon>
        <path d='M12 4v11' />
        <path d='M7 11l5 5 5-5' />
        <path d='M5 20h14' />
    </TabIcon>
);

export const ProfileIcon: FC = () => (
    <TabIcon>
        <circle cx='12' cy='8' r='4' />
        <path d='M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1' />
    </TabIcon>
);
