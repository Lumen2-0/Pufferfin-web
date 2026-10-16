import React, { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { useQuery } from '@tanstack/react-query';

import { playbackManager } from 'components/playback/playbackmanager';
import { useApi } from 'hooks/useApi';
import Events from 'utils/events';
import type { ItemDto } from 'types/base/models/item-dto';
import { ItemKind } from 'types/base/models/item-kind';

import { TranslationProvider, useTranslation } from '../../i18n/useTranslation';
import { useSeasonEpisodes } from '../catalog/api/useCatalog';
import { useCanRequest } from '../requests/api/useCanRequest';
import { RequestKind } from '../requests/api/types';
import { useCreateRequest, useMyRequests } from '../requests/api/useRequests';
import { findEpisodeRequest } from '../series/utils/episodes';
import { playItemById } from '../../utils/playback';

/** Seconds before the end where the prompt shows. */
const PROMPT_SECONDS = 30;
/** Under this length a video is no episode worth a prompt (a clip, an intro). */
const MIN_SECONDS = 120;

/**
 * The episode being played when it nears its end with nothing queued after it:
 * the native up-next dialog only exists when a next item is queued, so a
 * missing next episode gets this prompt instead.
 */
function useEpisodeNearEnd() {
    const [ episode, setEpisode ] = useState<ItemDto | null>(null);
    const dismissed = useRef(false);

    useEffect(() => {
        let current: ItemDto | null = null;
        let player: unknown = null;

        const onStart = (_event: unknown, started: unknown) => {
            player = started;
            current = (started ? playbackManager.currentItem(started) : null) as ItemDto | null;
            if (current?.Type !== ItemKind.Episode) current = null;
            dismissed.current = false;
            setEpisode(null);
        };
        const onStop = () => {
            current = null;
            setEpisode(null);
        };
        const onTime = (event: Event) => {
            const video = event.target;
            if (!current || !(video instanceof HTMLVideoElement) || !video.closest('.videoPlayerContainer')) return;
            const { duration, currentTime } = video;
            const isNear = Number.isFinite(duration) && duration > MIN_SECONDS && duration - currentTime <= PROMPT_SECONDS;
            const hasNext = playbackManager.getCurrentPlaylistIndex(player) < playbackManager.getPlaylist(player).length - 1;
            setEpisode(isNear && !hasNext && !dismissed.current ? current : null);
        };

        Events.on(playbackManager, 'playbackstart', onStart);
        Events.on(playbackManager, 'playbackstop', onStop);
        document.addEventListener('timeupdate', onTime, true);
        return () => {
            Events.off(playbackManager, 'playbackstart', onStart);
            Events.off(playbackManager, 'playbackstop', onStop);
            document.removeEventListener('timeupdate', onTime, true);
        };
    }, []);

    return {
        episode,
        dismiss: () => {
            dismissed.current = true;
            setEpisode(null);
        }
    };
}

const NextEpisodeCard: FC<{ episode: ItemDto, onDismiss: () => void }> = ({ episode, onDismiss }) => {
    const { api, user } = useApi();
    const t = useTranslation();
    const season = episode.ParentIndexNumber ?? 0;
    const number = episode.IndexNumber ?? 0;

    const series = useQuery({
        queryKey: [ 'Pufferfin', 'NextEpisode', 'Series', episode.SeriesId ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user!.Id!,
                ids: [ episode.SeriesId! ],
                fields: [ ItemFields.ProviderIds ],
                enableImages: false,
                enableTotalRecordCount: false
            }, { signal });
            return Number((response.data.Items?.[0] as ItemDto | undefined)?.ProviderIds?.Tmdb) || 0;
        },
        enabled: !!api && !!user?.Id && !!episode.SeriesId,
        staleTime: Infinity
    });
    const tmdbId = series.data || undefined;

    const current = useSeasonEpisodes(tmdbId, season);
    const afterCurrent = current.data?.Episodes.find(item => item.SeasonNumber === season && (item.EpisodeNumber ?? 0) > number);
    const nextSeason = useSeasonEpisodes(tmdbId, current.isSuccess && !afterCurrent ? season + 1 : undefined);
    const next = afterCurrent ?? nextSeason.data?.Episodes.find(item => item.EpisodeNumber != null);

    const rights = useCanRequest('Sonarr');
    const requests = useMyRequests();
    const { mutate: create, isPending, isSuccess } = useCreateRequest();

    const nextLocalId = next?.LocalItemId;
    const watch = useCallback(() => {
        onDismiss();
        if (api && user?.Id && nextLocalId) void playItemById(api, user.Id, nextLocalId);
    }, [ api, nextLocalId, onDismiss, user?.Id ]);
    const download = useCallback(() => {
        if (tmdbId && next?.EpisodeNumber != null) {
            create({ Kind: RequestKind.Episode, TmdbId: tmdbId, SeasonNumber: next.SeasonNumber, EpisodeNumber: next.EpisodeNumber });
        }
    }, [ create, next?.EpisodeNumber, next?.SeasonNumber, tmdbId ]);

    if (!next || !tmdbId) return null;

    const request = findEpisodeRequest(requests.data, tmdbId, next);
    const code = t('NextEpisodeShort', next.SeasonNumber, next.EpisodeNumber ?? 0);
    const label = next.Title ? `${code} - ${next.Title}` : code;
    const isMissing = !next.LocalItemId;
    if (isMissing && !rights.canRequest && !request) return null;

    return (
        <div className='pf-nextep' role='dialog' aria-label={t('NextEpisodeUp')}>
            <p className='pf-nextep__eyebrow'>{t(isMissing ? 'NextEpisodeMissing' : 'NextEpisodeUp')}</p>
            <p className='pf-nextep__title'>{label}</p>
            <div className='pf-nextep__buttons'>
                {isMissing ? (
                    <button
                        type='button'
                        className='pf-nextep__primary'
                        disabled={isPending || isSuccess || !!request}
                        onClick={download}
                    >
                        {t(isSuccess || request ? 'NextEpisodeRequested' : 'NextEpisodeDownload')}
                    </button>
                ) : (
                    <button type='button' className='pf-nextep__primary' onClick={watch}>
                        {t('NextEpisodeWatch')}
                    </button>
                )}
                <button type='button' className='pf-nextep__secondary' onClick={onDismiss}>
                    {t('NextEpisodeLater')}
                </button>
            </div>
        </div>
    );
};

const NextEpisodePrompt: FC = () => {
    const { episode, dismiss } = useEpisodeNearEnd();
    if (!episode) return null;
    return createPortal(
        <TranslationProvider>
            <NextEpisodeCard key={episode.Id} episode={episode} onDismiss={dismiss} />
        </TranslationProvider>,
        document.body
    );
};

export default NextEpisodePrompt;
