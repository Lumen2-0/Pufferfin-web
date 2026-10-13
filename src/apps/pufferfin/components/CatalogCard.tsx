import React, { type FC, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useApi } from 'hooks/useApi';

import { getAudiobookCaption } from '../features/audiobooks/utils/audiobooks';
import { CatalogAvailability, type CatalogItem, CatalogItemKind } from '../features/catalog/api/types';
import { getCatalogItemPath, isMissing } from '../features/catalog/utils/catalog';
import { useTranslation } from '../i18n/useTranslation';
import { getItemPosterUrl } from '../utils/images';
import { usePlayItemId } from '../utils/usePlay';
import PosterCard from './PosterCard';
import { CloudOutlined } from './icons';

/**
 * Poster of a catalog entry, on disk or not. A missing title carries a
 * discreet badge and opens its catalog sheet; a title on disk opens its
 * library detail page, and plays from the small Play of its art.
 */
const CatalogCard: FC<{ item: CatalogItem }> = ({ item }) => {
    const t = useTranslation();
    const { api } = useApi();
    const navigate = useNavigate();

    const path = getCatalogItemPath(item);
    const openPath = useCallback((target: string | undefined) => {
        if (target) navigate(target);
    }, [ navigate ]);
    const yearText = item.Year ? String(item.Year) : undefined;
    // A film, a series or an audiobook on disk plays from its card; a book to read does not
    const playItemId = usePlayItemId();
    const localPlayId = item.Availability === CatalogAvailability.OnDisk && item.Kind !== CatalogItemKind.Person ?
        item.LocalItemId ?? undefined :
        undefined;
    const onPlay = useCallback(() => playItemId(localPlayId), [ localPlayId, playItemId ]);
    let imageUrl = item.ImageUrl ?? undefined;
    if (!imageUrl && item.LocalItemId && api) imageUrl = getItemPosterUrl(api, item.LocalItemId);

    return (
        <PosterCard
            title={item.Title}
            subtitle={item.Kind === CatalogItemKind.Audiobook ? getAudiobookCaption(item, t) : yearText}
            imageUrl={imageUrl}
            shape={item.Kind === CatalogItemKind.Audiobook ? 'square' : 'portrait'}
            badge={isMissing(item) ? { icon: <CloudOutlined fontSize='inherit' />, label: t('NotInLibrary') } : undefined}
            value={path}
            onSelect={openPath}
            onPlay={localPlayId ? onPlay : undefined}
        />
    );
};

export default CatalogCard;
