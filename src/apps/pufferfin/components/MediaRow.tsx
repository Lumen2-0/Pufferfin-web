import ErrorOutline from '@mui/icons-material/ErrorOutline';
import React, { type ReactNode, useId } from 'react';

import { useTranslation } from '../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE } from '../navigation/focus';
import type { CardShape } from '../utils/images';

const SKELETON_COUNT = 6;

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
        content = (
            <div className='pf-row__list' aria-busy='true'>
                <span className='pf-visually-hidden'>{t('Loading')}</span>
                {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                    <span key={index} className={`pf-card pf-card--${shape} pf-card--skeleton`} aria-hidden='true'>
                        <span className='pf-card__art' />
                    </span>
                ))}
            </div>
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
            <ul className='pf-row__list'>
                {items?.map(item => (
                    <li key={getKey(item)} className='pf-row__item'>
                        {renderItem(item)}
                    </li>
                ))}
            </ul>
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
