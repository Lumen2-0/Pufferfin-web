import type { StringKey } from '../../../i18n/translate';
import { type MediaRequest, RequestProblemCode, RequestState } from '../api/types';

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
