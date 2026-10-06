import type { StringKey } from '../../../i18n/translate';
import { type MediaRequest, RequestKind, RequestProblemCode, RequestState } from '../api/types';
import { getProgressPercent } from './requests';

type Translate = (key: StringKey, ...args: Array<string | number>) => string;

const STATE_LABELS: Record<RequestState, StringKey> = {
    [RequestState.PendingApproval]: 'RequestPendingApproval',
    [RequestState.Queued]: 'RequestQueued',
    [RequestState.Searching]: 'RequestSearching',
    [RequestState.WaitingForSources]: 'RequestWaitingForSources',
    [RequestState.Downloading]: 'RequestDownloading',
    [RequestState.Importing]: 'RequestImporting',
    [RequestState.Available]: 'RequestAvailable',
    [RequestState.Failed]: 'RequestFailed',
    [RequestState.Cancelled]: 'RequestCancelled',
    [RequestState.Rejected]: 'RequestRejected'
};

const PROBLEM_LABELS: Record<RequestProblemCode, StringKey> = {
    [RequestProblemCode.ServiceDisabled]: 'RequestProblemServiceDisabled',
    [RequestProblemCode.ServiceUnavailable]: 'RequestProblemServiceUnavailable',
    [RequestProblemCode.TitleUnknown]: 'RequestProblemTitleUnknown',
    [RequestProblemCode.TvdbIdMissing]: 'RequestProblemTvdbIdMissing',
    [RequestProblemCode.NoRootFolder]: 'RequestProblemNoRootFolder',
    [RequestProblemCode.EpisodeNotFound]: 'RequestProblemEpisodeNotFound',
    [RequestProblemCode.NoRelease]: 'RequestProblemNoRelease',
    [RequestProblemCode.IndexersUnavailable]: 'RequestProblemIndexersUnavailable',
    [RequestProblemCode.NoIndexer]: 'RequestProblemNoIndexer',
    [RequestProblemCode.OnlySeasonPacks]: 'RequestProblemOnlySeasonPacks',
    [RequestProblemCode.NoAcceptableLanguage]: 'RequestProblemNoAcceptableLanguage',
    [RequestProblemCode.DownloadFailed]: 'RequestProblemDownloadFailed',
    [RequestProblemCode.ImportBlocked]: 'RequestProblemImportBlocked',
    [RequestProblemCode.DownloadWarning]: 'RequestProblemDownloadWarning'
};

/** Label of the state of a request. */
export const getRequestStateLabel = (item: MediaRequest): StringKey => STATE_LABELS[item.State];

/** Where a request stands, in words: the place in line while queued, the percentage while downloading. */
export function getRequestStateText(item: MediaRequest, t: Translate): string {
    if (item.State === RequestState.Queued && item.QueuePosition) return t('RequestQueuedPosition', item.QueuePosition);
    if (item.State === RequestState.Downloading) return t('RequestDownloadingPercent', getProgressPercent(item));
    return t(getRequestStateLabel(item));
}

/** The season or the episode a request is about, if it is not a movie. */
export function getRequestPartText(item: MediaRequest, t: Translate): string | undefined {
    if (item.Kind === RequestKind.Episode && item.SeasonNumber != null && item.EpisodeNumber != null) {
        return t('EpisodeNumber', item.SeasonNumber, item.EpisodeNumber);
    }
    if (item.Kind === RequestKind.Season && item.SeasonNumber != null) return t('SeasonNumber', item.SeasonNumber);
    return undefined;
}

/** Translated reason of a problem; an unknown code from a newer server falls back to a generic sentence. */
export const getRequestProblemLabel = (item: MediaRequest): StringKey | undefined => {
    if (!item.Problem) return undefined;
    return PROBLEM_LABELS[item.Problem.Code] ?? 'RequestProblemUnknown';
};

const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_TOO_MANY_REQUESTS = 429;

/** Why the server refused to create a request, from the HTTP status it answered. */
export function getCreateErrorLabel(status: number | undefined): StringKey {
    switch (status) {
        case HTTP_FORBIDDEN:
            return 'RequestErrorNotAllowed';
        case HTTP_NOT_FOUND:
            return 'RequestErrorTitleUnknown';
        case HTTP_CONFLICT:
            return 'RequestErrorServiceDisabled';
        case HTTP_TOO_MANY_REQUESTS:
            return 'RequestErrorQuota';
        default:
            return 'RequestErrorGeneric';
    }
}
