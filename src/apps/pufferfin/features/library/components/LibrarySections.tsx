import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useQuery } from '@tanstack/react-query';
import React, { type FC, useCallback, useMemo } from 'react';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import PosterCard from '../../../components/PosterCard';
import MediaRow from '../../../components/MediaRow';
import type { StringKey } from '../../../i18n/translate';
import { useTranslation } from '../../../i18n/useTranslation';
import { getCardImageUrl } from '../../../utils/images';
import { getDisplayTitle } from '../../../utils/items';
import { useOpenItem } from '../../../utils/navigation';
import { isPlayableItem } from '../../../utils/playback';
import { usePlayItem } from '../../../utils/usePlay';
import { LatestRow } from '../../discover/components/DiscoverRows';
import { useLibraryGenres } from '../api/useLibraryItems';

const ROW_SIZE = 20;
// Asked wider than shown: anime is taken out of Films and Series afterwards
const FETCH_SIZE = 80;
const BOTH = [ BaseItemKind.Movie, BaseItemKind.Series ];

type Section = 'movies' | 'series' | 'anime';

const TITLES: Record<Section, StringKey> = {
    movies: 'RowMovies',
    series: 'RowShows',
    anime: 'RowLibraryAnime'
};

const getKey = (item: ItemDto) => item.Id ?? '';

/** The anime genre of the server, or the animation one when there is no anime. */
const findAnimeGenre = (genres: ItemDto[] | undefined) => {
    const named = (name: string) => genres?.find(genre => genre.Name?.toLowerCase() === name);
    return named('anime') ?? named('animation');
};

const isAnime = (item: ItemDto, animeName: string | undefined) =>
    !!animeName && !!item.Genres?.some(genre => genre.toLowerCase() === animeName.toLowerCase());

const useSectionItems = (section: Section, animeId: string | undefined, animeName: string | undefined, isReady: boolean) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'LibrarySection', section, animeId, user?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user!.Id!,
                recursive: true,
                includeItemTypes: section === 'anime' ? BOTH : [ section === 'movies' ? BaseItemKind.Movie : BaseItemKind.Series ],
                genreIds: section === 'anime' && animeId ? [ animeId ] : undefined,
                sortBy: [ ItemSortBy.DateCreated ],
                sortOrder: [ SortOrder.Descending ],
                fields: [ ItemFields.Genres ],
                enableImageTypes: [ ImageType.Primary ],
                imageTypeLimit: 1,
                limit: FETCH_SIZE
            }, { signal });
            const items = (response.data.Items ?? []) as ItemDto[];
            return (section === 'anime' ? items : items.filter(item => !isAnime(item, animeName))).slice(0, ROW_SIZE);
        },
        enabled: !!api && !!user?.Id && isReady && (section !== 'anime' || !!animeId)
    });
};

const SectionRow: FC<{ section: Section, animeId?: string, animeName?: string, isReady: boolean }> = ({ section, animeId, animeName, isReady }) => {
    const t = useTranslation();
    const { api } = useApi();
    const openItem = useOpenItem();
    const playItem = usePlayItem();
    const items = useSectionItems(section, animeId, animeName, isReady);

    const renderItem = useCallback((item: ItemDto) => (
        <PosterCard
            title={getDisplayTitle(item)}
            subtitle={item.ProductionYear ? String(item.ProductionYear) : undefined}
            imageUrl={api ? getCardImageUrl(api, item, 'portrait') : undefined}
            shape='portrait'
            value={item}
            onSelect={openItem}
            onPlay={isPlayableItem(item) ? playItem : undefined}
        />
    ), [ api, openItem, playItem ]);

    // No anime on the server: the row has nothing to show, and says nothing
    if (section === 'anime' && isReady && !animeId) return null;

    return (
        <MediaRow
            title={t(TITLES[section])}
            shape='portrait'
            items={items.data}
            isPending={!isReady || items.isPending}
            isError={items.isError}
            getKey={getKey}
            renderItem={renderItem}
        />
    );
};

/**
 * The library of every title as titled rows instead of one grid: what is new,
 * then films, series and anime apart. Any filter or order brings the grid back.
 */
const LibrarySections: FC = () => {
    const genres = useLibraryGenres(undefined, BOTH, true);
    const anime = useMemo(() => findAnimeGenre(genres.data), [ genres.data ]);
    const isReady = !genres.isPending;

    return (
        <div className='pf-lib-sections'>
            <LatestRow itemTypes={BOTH} />
            <SectionRow section='movies' animeName={anime?.Name ?? undefined} isReady={isReady} />
            <SectionRow section='series' animeName={anime?.Name ?? undefined} isReady={isReady} />
            <SectionRow section='anime' animeId={anime?.Id ?? undefined} animeName={anime?.Name ?? undefined} isReady={isReady} />
        </div>
    );
};

export default LibrarySections;
