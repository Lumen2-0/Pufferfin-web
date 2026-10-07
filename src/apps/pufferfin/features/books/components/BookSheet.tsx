import ErrorOutline from '@mui/icons-material/ErrorOutline';
import MenuBook from '@mui/icons-material/MenuBook';
import { isAxiosError } from 'axios';
import React, { type FC, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import Hero from '../../../components/Hero';
import RoundButton from '../../../components/RoundButton';
import { useTranslation } from '../../../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../../../navigation/focus';
import { useInitialFocus } from '../../../navigation/useInitialFocus';
import { getItemPath } from '../../../routes/paths';
import { CatalogAvailability, type CatalogItem } from '../../catalog/api/types';
import { useCatalogBook } from '../../catalog/api/useCatalog';
import { type CreateMediaRequest, RequestKind } from '../../requests/api/types';
import { useCanRequest } from '../../requests/api/useCanRequest';
import { useMyRequests } from '../../requests/api/useRequests';
import RequestActions, { useFocusFollowsButtons } from '../../requests/components/RequestActions';
import { findEbookRequest } from '../../requests/utils/requests';

const HTTP_SERVICE_UNAVAILABLE = 503;

/**
 * Read when the book is in the library (its library page holds the reader),
 * else Download and the state of its request, in one container so the focus
 * follows when Download turns into Read.
 */
const BookActions: FC<{ book: CatalogItem, provider: string, bookId: string }> = ({ book, provider, bookId }) => {
    const t = useTranslation();
    const navigate = useNavigate();
    const { containerRef, onFocus, onBlur } = useFocusFollowsButtons();
    const requests = useMyRequests();
    const { canRequest } = useCanRequest('Shelfmark');

    const localItemId = book.Availability === CatalogAvailability.OnDisk ? book.LocalItemId : undefined;
    const onRead = useCallback((itemId: string) => navigate(getItemPath(itemId)), [ navigate ]);

    // The server picks the release itself: the language from the settings, then the best format and the most seeders
    const requestInput = useMemo<CreateMediaRequest>(
        () => ({ Kind: RequestKind.Ebook, BookProvider: provider, BookId: bookId }),
        [ provider, bookId ]
    );

    return (
        <div ref={containerRef} className='pf-request' onFocus={onFocus} onBlur={onBlur}>
            {localItemId ? (
                <div className='pf-button-row'>
                    <RoundButton
                        variant='primary'
                        icon={<MenuBook />}
                        label={t('ActionRead')}
                        value={localItemId}
                        onClick={onRead}
                    />
                </div>
            ) : (
                <RequestActions
                    requestInput={requestInput}
                    request={findEbookRequest(requests.data, provider, bookId)}
                    canRequest={canRequest}
                    lastSyncAt={requests.dataUpdatedAt}
                />
            )}
        </div>
    );
};

/**
 * Sheet of a book to read, on the catalog sheet route: cover, authors, year,
 * summary. Read when the book is in the library, else Download.
 */
const BookSheet: FC<{ provider: string, bookId: string }> = ({ provider, bookId }) => {
    const t = useTranslation();
    const pageRef = useRef<HTMLDivElement>(null);
    const { data: book, isPending, isError, error } = useCatalogBook(provider, bookId);
    const requests = useMyRequests();
    const rights = useCanRequest('Shelfmark');

    // The focus waits for the actions, so it lands on Read or Download rather than on the summary
    const isReady = !!book && rights.isSettled && !requests.isPending;
    useInitialFocus(pageRef, [ book, isReady ], isReady);

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
                <p>{isUnavailable ? t('BookCatalogUnavailable') : t('ItemLoadError')}</p>
            </div>
        );
    }

    const authors = book.Authors ?? [];
    const meta = [ authors.join(', '), book.Year ? String(book.Year) : undefined ]
        .filter((value): value is string => !!value);

    return (
        <div ref={pageRef} className='pf-details'>
            <Hero
                title={book.Title}
                eyebrow={book.SeriesName ?? undefined}
                meta={meta.length > 0 && (
                    <ul className='pf-meta'>
                        {meta.map(value => <li key={value} className='pf-meta__item'>{value}</li>)}
                    </ul>
                )}
                overview={book.Overview}
                posterUrl={book.ImageUrl ?? undefined}
                posterShape='portrait'
                actions={<BookActions book={book} provider={provider} bookId={bookId} />}
            />

            {(book.Overview || authors.length > 0) && (
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
                                {authors.length > 0 && (
                                    <>
                                        <dt>{t('LabelAuthors')}</dt>
                                        <dd>{authors.join(', ')}</dd>
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
            )}
        </div>
    );
};

export default BookSheet;
