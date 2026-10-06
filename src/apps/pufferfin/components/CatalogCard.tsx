import CloudOutlined from '@mui/icons-material/CloudOutlined';
import React, { type FC, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useApi } from 'hooks/useApi';

import type { CatalogItem } from '../features/catalog/api/types';
import { getCatalogItemPath, isMissing } from '../features/catalog/utils/catalog';
import { useTranslation } from '../i18n/useTranslation';
import { getItemPosterUrl } from '../utils/images';
import PosterCard from './PosterCard';

/**
 * Poster of a catalog entry, on disk or not. A missing title carries a
 * discreet badge and opens its catalog sheet; a title on disk opens its
 * library detail page.
 */
const CatalogCard: FC<{ item: CatalogItem }> = ({ item }) => {
    const t = useTranslation();
    const { api } = useApi();
    const navigate = useNavigate();

    const path = getCatalogItemPath(item);
    const openPath = useCallback((target: string | undefined) => {
        if (target) navigate(target);
    }, [ navigate ]);
    let imageUrl = item.ImageUrl ?? undefined;
    if (!imageUrl && item.LocalItemId && api) imageUrl = getItemPosterUrl(api, item.LocalItemId);

    return (
        <PosterCard
            title={item.Title}
            subtitle={item.Year ? String(item.Year) : undefined}
            imageUrl={imageUrl}
            shape='portrait'
            badge={isMissing(item) ? { icon: <CloudOutlined fontSize='inherit' />, label: t('NotInLibrary') } : undefined}
            value={path}
            onSelect={openPath}
        />
    );
};

export default CatalogCard;
