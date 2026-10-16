import React, { type FC } from 'react';

import { useCatalogTitle } from '../features/catalog/api/useCatalog';
import { type CatalogItem, CatalogItemKind } from '../features/catalog/api/types';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import { OpenInNew } from './icons';

/** Opens the IMDb page of a film or a series, for its rating and its reviews. Before its IMDb id is known, an IMDb search of the title stands in. */
const ImdbButton: FC<{ item: CatalogItem }> = ({ item }) => {
    const t = useTranslation();
    const kind = item.Kind === CatalogItemKind.Series ? CatalogItemKind.Series : CatalogItemKind.Movie;
    const title = useCatalogTitle(kind, item.TmdbId ?? 0, !!item.TmdbId);
    const imdbId = title.data?.ImdbId;
    const query = encodeURIComponent([ item.Title, item.Year ].filter(Boolean).join(' '));
    let href = 'https://www.imdb.com/find/?q=' + query;
    if (imdbId) href = 'https://www.imdb.com/title/' + encodeURIComponent(imdbId) + '/';

    return (
        <a
            className='pf-button pf-button--quiet'
            href={href}
            target='_blank'
            rel='noopener noreferrer'
            aria-label={t('HeroImdbLabel', item.Title)}
            {...{ [FOCUSABLE_ATTRIBUTE]: true }}
        >
            <span className='pf-button__icon' aria-hidden='true'><OpenInNew /></span>
            <span className='pf-button__label'>{t('HeroImdb')}</span>
        </a>
    );
};

export default ImdbButton;
