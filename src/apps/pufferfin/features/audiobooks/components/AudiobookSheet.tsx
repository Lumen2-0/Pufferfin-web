import ErrorOutline from '@mui/icons-material/ErrorOutline';
import Headphones from '@mui/icons-material/Headphones';
import { isAxiosError } from 'axios';
import React, { type FC, useCallback, useMemo, useRef } from 'react';

import { useApi } from 'hooks/useApi';

import Hero from '../../../components/Hero';
import RoundButton from '../../../components/RoundButton';
import { useTranslation } from '../../../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../../../navigation/focus';
import { useInitialFocus } from '../../../navigation/useInitialFocus';
import { playAudiobookById } from '../../../utils/playback';
import { CatalogAvailability, type CatalogAudiobookDetails } from '../../catalog/api/types';
import { useAudiobook } from '../../catalog/api/useCatalog';
import { type CreateMediaRequest, RequestKind } from '../../requests/api/types';
import { useCanRequest } from '../../requests/api/useCanRequest';
import { useMyRequests } from '../../requests/api/useRequests';
import RequestActions, { useFocusFollowsButtons } from '../../requests/components/RequestActions';
import { findAudiobookRequest } from '../../requests/utils/requests';
import { getAudiobookMeta } from '../utils/audiobooks';

const HTTP_SERVICE_UNAVAILABLE = 503;

/**
 * Listen when the book is in the library, else Download and the state of its
 * request. Both live in one container, so when the request becomes available
 * and Download turns into Listen, the focus follows.
 */
const AudiobookActions: FC<{ book: CatalogAudiobookDetails }> = ({ book }) => {
    const t = useTranslation();
    const { api, user } = useApi();
    const { containerRef, onFocus, onBlur } = useFocusFollowsButtons();
    const requests = useMyRequests();
    const { canRequest } = useCanRequest('Shelfmark');

    const localItemId = book.Availability === CatalogAvailability.OnDisk ? book.LocalItemId : undefined;
    const onListen = useCallback((itemId: string) => {
        // A book in several files is its folder: its parts play in order, from where the user stopped
        if (api && user?.Id) void playAudiobookById(api, user.Id, itemId);
    }, [ api, user?.Id ]);

    // The server picks the version itself: the language from the settings, then the most seeders
    const requestInput = useMemo<CreateMediaRequest>(
        () => ({ Kind: RequestKind.Audiobook, Asin: book.Asin, Market: book.Market }),
        [ book.Asin, book.Market ]
    );

    return (
        <div ref={containerRef} className='pf-request' onFocus={onFocus} onBlur={onBlur}>
            {localItemId ? (
                <div className='pf-button-row'>
                    <RoundButton
                        variant='primary'
                        icon={<Headphones />}
                        label={t('ActionListen')}
                        value={localItemId}
                        onClick={onListen}
                    />
                </div>
            ) : (
                <RequestActions
                    requestInput={requestInput}
                    request={findAudiobookRequest(requests.data, book.Asin)}
                    canRequest={canRequest}
                    lastSyncAt={requests.dataUpdatedAt}
                />
            )}
        </div>
    );
};

/**
 * Sheet of an audiobook, on the catalog sheet route: cover, authors and
 * narrators, series and position, length, summary. A complete edition says so
 * in words. Listen when the book is in the library, else Download.
 */
const AudiobookSheet: FC<{ asin: string, market?: string }> = ({ asin, market }) => {
    const t = useTranslation();
    const pageRef = useRef<HTMLDivElement>(null);
    const { data: book, isPending, isError, error } = useAudiobook(asin, market);
    const requests = useMyRequests();
    const rights = useCanRequest('Shelfmark');

    // The focus waits for the actions, so it lands on Listen or Download rather than on the summary
    const isReady = !!book && rights.isSettled && !requests.isPending;
    useInitialFocus(pageRef, [ book, isReady ], isReady);

    const meta = useMemo(() => (book ? getAudiobookMeta(book, t) : []), [ book, t ]);

    if (isPending) {
        return (
            <div className='pf-status' aria-busy='true'>
                <p>{t('Loading')}</p>
            </div>
        );
    }

    if (isError || !book) {
        const isUnavailable = isAxiosError(error) && error.response?.status === HTTP_SERVICE_UNAVAILABLE;
        return (
            <div className='pf-status' role='status'>
                <ErrorOutline aria-hidden='true' />
                <p>{isUnavailable ? t('AudiobookCatalogUnavailable') : t('ItemLoadError')}</p>
            </div>
        );
    }

    let series: string | undefined;
    if (book.SeriesName) {
        series = book.SeriesPosition ? t('AudiobookSeriesPosition', book.SeriesName, book.SeriesPosition) : book.SeriesName;
    }

    return (
        <div ref={pageRef} className='pf-details'>
            <Hero
                title={book.Title}
                eyebrow={series ?? book.Subtitle ?? undefined}
                meta={meta.length > 0 && (
                    <ul className='pf-meta'>
                        {meta.map(value => <li key={value} className='pf-meta__item'>{value}</li>)}
                    </ul>
                )}
                overview={book.Overview}
                posterUrl={book.ImageUrl ?? undefined}
                posterShape='square'
                actions={<AudiobookActions book={book} />}
            />

            <div className='pf-details__sections'>
                <section
                    className='pf-about'
                    aria-labelledby='pf-about-title'
                    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- remote users must reach a section that holds only text
                    tabIndex={0}
                    {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                >
                    <h2 id='pf-about-title' className='pf-row__title pf-about__title'>{t('SectionAbout')}</h2>
                    <div className='pf-about__body'>
                        {book.Overview && <p className='pf-about__overview'>{book.Overview}</p>}
                        <dl className='pf-about__facts'>
                            {book.Authors.length > 0 && (
                                <>
                                    <dt>{t('LabelAuthors')}</dt>
                                    <dd>{book.Authors.join(', ')}</dd>
                                </>
                            )}
                            {book.Narrators.length > 0 && (
                                <>
                                    <dt>{t('LabelNarrators')}</dt>
                                    <dd>{book.Narrators.join(', ')}</dd>
                                </>
                            )}
                            {series && (
                                <>
                                    <dt>{t('LabelSeries')}</dt>
                                    <dd>{series}</dd>
                                </>
                            )}
                            {book.Language && (
                                <>
                                    <dt>{t('LabelLanguage')}</dt>
                                    <dd>{book.Language}</dd>
                                </>
                            )}
                        </dl>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AudiobookSheet;
