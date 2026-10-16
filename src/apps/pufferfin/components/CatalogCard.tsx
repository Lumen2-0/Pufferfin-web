import React, { type FC, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useApi } from 'hooks/useApi';

import { getAudiobookCaption } from '../features/audiobooks/utils/audiobooks';
import { CatalogAvailability, type CatalogItem, CatalogItemKind } from '../features/catalog/api/types';
import { getCatalogItemPath } from '../features/catalog/utils/catalog';
import type { CatalogTitleKind } from '../routes/paths';
import { useTranslation } from '../i18n/useTranslation';
import { getItemPosterUrl } from '../utils/images';
import { usePlayItemId } from '../utils/usePlay';
import CardQuickActions from './CardQuickActions';
import CardTrailerPreview from '../features/trailers/CardTrailerPreview';
import PosterCard from './PosterCard';

/**
 * Poster of a catalog entry, on disk or not. A missing title carries a
 * discreet badge and opens its catalog sheet; a title on disk opens its
 * library detail page, and plays from the small Play of its art.
 */
/** `showKind` tags the poster Film or Series, for rows that mix both. */
const CatalogCard: FC<{ item: CatalogItem, showKind?: boolean }> = ({ item, showKind }) => {
    const t = useTranslation();
    const { api } = useApi();
    const navigate = useNavigate();

    const path = getCatalogItemPath(item);
    const open = useCallback(() => {
        if (path) navigate(path);
    }, [ navigate, path ]);
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

    const kindLabel = t(item.Kind === CatalogItemKind.Series ? 'KindSeries' : 'KindMovie');

    const card = (
        <PosterCard
            title={item.Title}
            subtitle={item.Kind === CatalogItemKind.Audiobook ? getAudiobookCaption(item, t) : yearText}
            imageUrl={imageUrl}
            shape={item.Kind === CatalogItemKind.Audiobook ? 'square' : 'portrait'}
            tag={showKind ? kindLabel : undefined}
            badge={item.Availability === CatalogAvailability.OnDisk ? { label: t('InYourLibrary') } : undefined}
            value={path}
            onSelect={openPath}
            onPlay={localPlayId ? onPlay : undefined}
            overlay={<CardQuickActions item={item} />}
        />
    );

    const isTitle = item.Kind === CatalogItemKind.Movie || item.Kind === CatalogItemKind.Series;
    if (!isTitle || !item.TmdbId) return card;

    return (
        <CardTrailerPreview kind={item.Kind as CatalogTitleKind} tmdbId={item.TmdbId} imageUrl={imageUrl} onOpen={open}>
            {card}
        </CardTrailerPreview>
    );
};

export default CatalogCard;
