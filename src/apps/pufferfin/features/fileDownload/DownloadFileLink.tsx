import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { Download } from 'lucide-react';
import React, { type FC, type MouseEvent, useCallback } from 'react';

import { useApi } from 'hooks/useApi';

import { useTranslation } from '../../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../../navigation/focus';
import { useUserPreference } from '../../utils/userPreference';
import { canDownloadFile, CONTENT_DOWNLOAD_SETTING, parseContentDownload } from './fileDownload';

import './fileDownload.scss';

/** Whether the user turned the download links on, and how to turn them on or off. */
export function useContentDownload(): [ boolean, (isEnabled: boolean) => void ] {
    const [ value, setValue ] = useUserPreference(CONTENT_DOWNLOAD_SETTING);
    const set = useCallback((isEnabled: boolean) => setValue(isEnabled ? 'true' : null), [ setValue ]);
    return [ parseContentDownload(value), set ];
}

interface DownloadFileLinkProps {
    item: Parameters<typeof canDownloadFile>[0]
    /** Smaller, for a card of an episode. */
    compact?: boolean
}

/**
 * "Download", highlighted next to the actions of a title on disk: the file
 * itself, straight from the server. It shows only when the user turned it on
 * in their preferences and their account may download.
 */
const DownloadFileLink: FC<DownloadFileLinkProps> = ({ item, compact }) => {
    const t = useTranslation();
    const { api, user } = useApi();
    const [ isEnabled ] = useContentDownload();
    // Inside a card, the link must not also open or play the card
    const stop = useCallback((event: MouseEvent) => event.stopPropagation(), []);

    if (!api || !item?.Id || !canDownloadFile(item, user?.Policy, isEnabled)) return null;

    return (
        <a
            className={compact ? 'pf-file-download pf-file-download--compact' : 'pf-file-download'}
            href={getLibraryApi(api).getDownloadUrl({ itemId: item.Id })}
            download
            onClick={stop}
            {...{ [FOCUSABLE_ATTRIBUTE]: true }}
        >
            <Download className='pf-file-download__icon' aria-hidden='true' focusable='false' size='1em' />
            {t('ActionDownloadFile')}
        </a>
    );
};

export default DownloadFileLink;
