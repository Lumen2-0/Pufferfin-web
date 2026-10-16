import React, { type FC, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { Shuffle } from '../components/icons';
import { CatalogItemKind } from '../features/catalog/api/types';
import { useTrending } from '../features/catalog/api/useCatalog';
import { getCatalogItemPath } from '../features/catalog/utils/catalog';
import { useVisibleCatalogItems } from '../features/preferences/useVisibleCatalogItems';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';

/** For a user who does not know what to watch: opens the sheet of a film or a series among the most watched of the moment. */
const RandomButton: FC = () => {
    const t = useTranslation();
    const navigate = useNavigate();
    const visible = useVisibleCatalogItems();
    const movies = useTrending(CatalogItemKind.Movie);
    const series = useTrending(CatalogItemKind.Series);

    const onClick = useCallback(() => {
        const paths = [ ...(visible(movies.data) ?? []), ...(visible(series.data) ?? []) ]
            .map(getCatalogItemPath)
            .filter((path): path is string => !!path);
        // Not a security use of randomness: any title will do
        // eslint-disable-next-line sonarjs/pseudo-random
        if (paths.length) navigate(paths[Math.floor(Math.random() * paths.length)]);
    }, [ movies.data, series.data, navigate, visible ]);

    return (
        <button
            type='button'
            className='pf-nav__random'
            aria-label={t('NavRandom')}
            title={t('NavRandom')}
            onClick={onClick}
            {...{ [FOCUSABLE_ATTRIBUTE]: true }}
        >
            <Shuffle fontSize='inherit' aria-hidden='true' />
        </button>
    );
};

export default RandomButton;
