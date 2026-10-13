import React, { type FC, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import MediaRow from '../../../components/MediaRow';
import PersonCard from '../../../components/PersonCard';
import { useTranslation } from '../../../i18n/useTranslation';
import { getTmdbPersonPath } from '../../../routes/paths';
import type { CatalogCredit } from '../../catalog/api/types';

const CAST_LIMIT = 24;

const getCreditKey = (credit: CatalogCredit) => `${credit.TmdbId}-${credit.Role ?? ''}`;

interface CatalogCastRowProps {
    cast: CatalogCredit[] | undefined
    isPending?: boolean
}

/** The cast of a title as TMDB knows it, each opening the TMDB page of the person. */
const CatalogCastRow: FC<CatalogCastRowProps> = ({ cast, isPending = false }) => {
    const t = useTranslation();
    const navigate = useNavigate();
    const openPerson = useCallback((tmdbId: number) => navigate(getTmdbPersonPath(tmdbId)), [ navigate ]);

    const renderCredit = useCallback((credit: CatalogCredit) => (
        <PersonCard
            name={credit.Name}
            role={credit.Role}
            imageUrl={credit.ImageUrl ?? undefined}
            value={credit.TmdbId}
            onSelect={openPerson}
        />
    ), [ openPerson ]);

    return (
        <MediaRow
            title={t('RowCast')}
            shape='portrait'
            items={cast?.slice(0, CAST_LIMIT)}
            isPending={isPending}
            isError={false}
            getKey={getCreditKey}
            renderItem={renderCredit}
        />
    );
};

export default CatalogCastRow;
