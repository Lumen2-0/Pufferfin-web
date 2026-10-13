import React, { type FC } from 'react';

import { getLetterboxdUrl, TextLink } from '../../components/TextAction';
import { useTranslation } from '../../i18n/useTranslation';
import { useUserPreference } from '../../utils/userPreference';
import { getSensCritiqueUrl, parseReviewSite, REVIEW_SITE_SETTING, ReviewSite } from './reviewSite';

/** The site of the reviews the user chose, Letterboxd unless they said otherwise, and how to change it. */
export function useReviewSite(): [ ReviewSite, (site: ReviewSite) => void ] {
    const [ value, setValue ] = useUserPreference(REVIEW_SITE_SETTING);
    return [ parseReviewSite(value), setValue ];
}

interface ReviewLinkProps {
    title: string
    year?: number | null
    /** A film has a Letterboxd page; a series only a SensCritique one. */
    isMovie: boolean
    tmdbId?: number | string | null
}

/** "See on Letterboxd" or "See on SensCritique", as gray underlined text next to the buttons of a sheet. */
const ReviewLink: FC<ReviewLinkProps> = ({ title, year, isMovie, tmdbId }) => {
    const t = useTranslation();
    const [ site ] = useReviewSite();

    if (site === ReviewSite.SensCritique) {
        return <TextLink href={getSensCritiqueUrl(title, year)}>{t('SeeOnSensCritique')}</TextLink>;
    }
    if (!isMovie || !tmdbId) return null;
    return <TextLink href={getLetterboxdUrl(tmdbId)}>{t('SeeOnLetterboxd')}</TextLink>;
};

export default ReviewLink;
