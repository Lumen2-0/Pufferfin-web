import { Timer } from 'lucide-react';
import React, { type FC } from 'react';

import globalize from 'lib/globalize';

import { useTranslation } from '../../../i18n/useTranslation';
import { useMyRequests } from '../api/useRequests';
import { findMovieRequest } from '../utils/requests';
import { formatExpiryDate, getTemporaryState } from '../utils/temporary';

import '../requests.scss';

interface TemporaryNoticeProps {
    /** The TMDB id of the film on the sheet. */
    tmdbId: number | undefined
}

/**
 * On the sheet of a film downloaded for a while: until when it stays, in a
 * quiet pill next to the actions. Nothing for a film that stays.
 */
const TemporaryNotice: FC<TemporaryNoticeProps> = ({ tmdbId }) => {
    const t = useTranslation();
    const requests = useMyRequests();
    const request = tmdbId ? findMovieRequest(requests.data, tmdbId) : undefined;
    const state = getTemporaryState(request, Date.now());
    if (state?.kind !== 'until') return null;

    return (
        <span className='pf-temporary-note' role='note'>
            <Timer className='pf-temporary-note__icon' size='1em' aria-hidden='true' focusable='false' />
            {t('TemporaryAvailableUntil', formatExpiryDate(state.expiresAt, globalize.getCurrentLocale() || undefined))}
        </span>
    );
};

export default TemporaryNotice;
