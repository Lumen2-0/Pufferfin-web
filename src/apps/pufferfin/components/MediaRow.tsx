import React, { type ReactNode, useId } from 'react';

import { useTranslation } from '../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE } from '../navigation/focus';
import type { CardShape } from '../utils/images';

import Rail from './Rail';
import { CardBone, SkeletonRegion } from './Skeleton';
import { ErrorOutline } from './icons';

const SKELETON_COUNT = 8;

interface MediaRowProps<T> {
    title: string
    shape: CardShape
    items: T[] | undefined
    isPending: boolean
    isError: boolean
    getKey: (item: T) => string
    renderItem: (item: T) => ReactNode
}

const MediaRow = <T, >({
    title,
    shape,
    items,
    isPending,
    isError,
    getKey,
    renderItem
}: MediaRowProps<T>) => {
    const t = useTranslation();
    const headingId = useId();

    // An empty row is noise: it simply does not show
    if (!isPending && !isError && !items?.length) return null;

    let content: ReactNode;
    if (isPending) {
        // The same list and items as the loaded row: the cards keep the same spacing
        content = (
            <SkeletonRegion>
                <ul className='pf-row__list'>
                    {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                        <li key={index}><CardBone shape={shape} withCaption={false} /></li>
                    ))}
                </ul>
            </SkeletonRegion>
        );
    } else if (isError) {
        // Failure is told with an icon and words, never with color alone
        content = (
            <p className='pf-row__error' role='status'>
                <ErrorOutline aria-hidden='true' />
                {t('RowLoadError')}
            </p>
        );
    } else {
        content = (
            <Rail className='pf-row__list'>
                {items?.map(item => (
                    <li key={getKey(item)}>
                        {renderItem(item)}
                    </li>
                ))}
            </Rail>
        );
    }

    return (
        <section
            className='pf-row'
            aria-labelledby={headingId}
            {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}
        >
            <h2 id={headingId} className='pf-row__title'>{title}</h2>
            {content}
        </section>
    );
};

export default MediaRow;
