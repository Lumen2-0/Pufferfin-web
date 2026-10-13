import { isAxiosError } from 'axios';
import React, { type FC, useCallback, useMemo, useState } from 'react';

import { toLocaleDateString } from 'scripts/datetime';

import Modal from '../../../components/Modal';
import RoundButton from '../../../components/RoundButton';
import { TextAction } from '../../../components/TextAction';
import { Check, Download, ErrorOutline, Tv } from '../../../components/icons';
import { useTranslation } from '../../../i18n/useTranslation';
import type { CatalogSeason } from '../../catalog/api/types';
import { type MediaRequest, RequestKind, RequestState } from '../../requests/api/types';
import { useCreateRequest, useMyRequests } from '../../requests/api/useRequests';
import DownloadTag from '../../requests/components/DownloadTag';
import { findSeriesRequests, isOver, summarizeRequests } from '../../requests/utils/requests';
import { getCreateErrorLabel } from '../../requests/utils/status';
import { DownloadIcon } from '../../details/components/sheetIcons';

/** Where a season stands, for its line in the window. */
export enum SeasonStatus {
    InLibrary = 'InLibrary',
    Upcoming = 'Upcoming',
    Missing = 'Missing',
    Partial = 'Partial'
}

/** Every episode on disk, not aired yet, some episodes on disk, or none. */
export function getSeasonStatus(season: CatalogSeason, today: Date): SeasonStatus {
    const total = season.EpisodeCount ?? 0;
    if (total > 0 && season.LocalEpisodeCount >= total) return SeasonStatus.InLibrary;
    if (!season.AirDate || Date.parse(season.AirDate) > today.getTime()) {
        return season.LocalEpisodeCount > 0 ? SeasonStatus.Partial : SeasonStatus.Upcoming;
    }
    return season.LocalEpisodeCount > 0 ? SeasonStatus.Partial : SeasonStatus.Missing;
}

/** The numbered seasons, in order; specials only when the library holds some of them. */
export const getListedSeasons = (seasons: CatalogSeason[]) =>
    seasons.filter(season => season.SeasonNumber > 0 || season.LocalEpisodeCount > 0);

const SeasonLine: FC<{
    season: CatalogSeason
    seriesTmdbId: number
    requests: MediaRequest[]
    lastSyncAt: number
    canRequest: boolean
}> = ({ season, seriesTmdbId, requests, lastSyncAt, canRequest }) => {
    const t = useTranslation();
    const create = useCreateRequest();
    const status = getSeasonStatus(season, new Date());
    // The requests of this season, or of its episodes, still on their way
    const live = useMemo(
        () => requests.filter(item => item.SeasonNumber === season.SeasonNumber && !isOver(item) && item.State !== RequestState.Available),
        [ requests, season.SeasonNumber ]
    );
    const tag = summarizeRequests(live, t);

    const { isPending, mutate } = create;
    const onDownload = useCallback(() => {
        if (isPending) return;
        mutate({ Kind: RequestKind.Season, TmdbId: seriesTmdbId, SeasonNumber: season.SeasonNumber });
    }, [ isPending, mutate, season.SeasonNumber, seriesTmdbId ]);

    const name = season.Name || t('SeasonNumber', season.SeasonNumber);
    const total = season.EpisodeCount ?? 0;
    let detail: string;
    if (status === SeasonStatus.Upcoming && season.AirDate) {
        detail = t('UpcomingOn', toLocaleDateString(new Date(season.AirDate), { timeZone: 'UTC' }));
    } else if (total > 0) {
        detail = t('SeasonEpisodesOnDisk', season.LocalEpisodeCount, total);
    } else {
        detail = t('SeasonEpisodesCount', season.LocalEpisodeCount);
    }
    const canDownload = canRequest && !tag && (status === SeasonStatus.Missing || status === SeasonStatus.Partial);

    let state: React.ReactNode = null;
    if (tag) {
        state = <DownloadTag tag={tag} lastSyncAt={lastSyncAt} />;
    } else if (status === SeasonStatus.InLibrary) {
        state = (
            <span className='pf-season-line__state'>
                <Check fontSize='inherit' aria-hidden='true' />
                {t('SpotlightInLibrary')}
            </span>
        );
    } else if (canDownload) {
        state = (
            <RoundButton
                icon={<Download />}
                label={t(status === SeasonStatus.Partial ? 'ActionDownloadMissing' : 'ActionDownload')}
                onClick={onDownload}
            />
        );
    }

    return (
        <li className='pf-season-line'>
            <div className='pf-season-line__poster' aria-hidden='true'>
                {season.PosterUrl ? <img src={season.PosterUrl} alt='' loading='lazy' /> : <Tv fontSize='inherit' />}
            </div>
            <div className='pf-season-line__text'>
                <span className='pf-season-line__name'>{name}</span>
                <span className='pf-season-line__detail'>{detail}</span>
                {create.isError && (
                    <span className='pf-season-line__error' role='alert'>
                        <ErrorOutline fontSize='inherit' aria-hidden='true' />
                        {t(getCreateErrorLabel(isAxiosError(create.error) ? create.error.response?.status : undefined))}
                    </span>
                )}
            </div>
            <div className='pf-season-line__action'>{state}</div>
        </li>
    );
};

interface SeasonDownloadsProps {
    seriesTmdbId: number
    seriesTitle: string
    seasons: CatalogSeason[]
    canRequest: boolean
    /** Gray underlined text next to Play, rather than a button next to Download all seasons. */
    asText?: boolean
    /** Among the actions of a series on disk: a button with the download arrow. */
    withDownloadIcon?: boolean
}

/**
 * Download a season: opens a window listing every season of the series, what
 * the library holds of it and where its download stands, each missing one
 * downloadable on its own.
 */
const SeasonDownloads: FC<SeasonDownloadsProps> = ({ seriesTmdbId, seriesTitle, seasons, canRequest, asText, withDownloadIcon }) => {
    const t = useTranslation();
    const [ isOpen, setIsOpen ] = useState(false);
    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const requestsQuery = useMyRequests();
    const requests = useMemo(() => findSeriesRequests(requestsQuery.data, seriesTmdbId), [ requestsQuery.data, seriesTmdbId ]);
    const listed = useMemo(() => getListedSeasons(seasons), [ seasons ]);

    if (!listed.length) return null;

    return (
        <>
            {asText ?
                <TextAction onClick={open}>{t('ActionDownloadSeason')}</TextAction> :
                <RoundButton icon={withDownloadIcon ? <DownloadIcon /> : <Tv />} label={t('ActionDownloadSeason')} onClick={open} />}
            {isOpen && (
                <Modal title={seriesTitle} icon={<Download fontSize='inherit' />} onClose={close} className='pf-seasons-modal'>
                    <ul className='pf-season-lines'>
                        {listed.map(season => (
                            <SeasonLine
                                key={season.SeasonNumber}
                                season={season}
                                seriesTmdbId={seriesTmdbId}
                                requests={requests}
                                lastSyncAt={requestsQuery.dataUpdatedAt}
                                canRequest={canRequest}
                            />
                        ))}
                    </ul>
                </Modal>
            )}
        </>
    );
};

export default SeasonDownloads;
