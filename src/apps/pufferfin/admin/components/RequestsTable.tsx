import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip, { type ChipProps } from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { MaterialReactTable, type MRT_ColumnDef, type MRT_Row, useMaterialReactTable } from 'material-react-table';
import React, { type ChangeEvent, type FC, type ReactElement, useCallback, useMemo, useState } from 'react';

import { type MediaRequest, RequestKind, RequestState } from 'apps/pufferfin/api/types';
import { translate } from 'apps/pufferfin/i18n';
import { useLocale } from 'hooks/useLocale';
import { useUsersDetails } from 'hooks/useUsers';

import { RequestAction, useMoveRequest, useRequestAction, useRequests } from '../api/useRequests';
import { formatBytes, formatPercent } from '../utils/format';
import { countWaiting, getRequestActions, getWaitingIndex } from '../utils/requests';
import { useTableTheme } from './useTableTheme';
import { ArrowDownward, ArrowUpward, Block, Check, Close, Replay } from '../../components/icons';

const STATE_COLORS: Record<RequestState, ChipProps['color']> = {
    [RequestState.PendingApproval]: 'warning',
    [RequestState.Queued]: 'default',
    [RequestState.Searching]: 'info',
    [RequestState.WaitingForSources]: 'default',
    [RequestState.Downloading]: 'info',
    [RequestState.Importing]: 'info',
    [RequestState.Available]: 'success',
    [RequestState.Failed]: 'error',
    [RequestState.Cancelled]: 'default',
    [RequestState.Rejected]: 'default'
};

const ORIGINAL_LANGUAGE = 'original';

const getRequestTitle = (request: MediaRequest) => {
    if (request.Kind === RequestKind.Season) {
        return translate('RequestTitleSeason', request.Title, request.SeasonNumber ?? '');
    }
    if (request.Kind === RequestKind.Episode) {
        return translate('RequestTitleEpisode', request.Title, request.SeasonNumber ?? '', request.EpisodeNumber ?? '');
    }
    return request.Title;
};

const getLanguage = (language: string | null | undefined, locale: string) => {
    if (!language) return '';
    if (language === ORIGINAL_LANGUAGE) return translate('RequestLanguageOriginal');

    try {
        return new Intl.DisplayNames([ locale ], { type: 'language' }).of(language) ?? language;
    } catch {
        return language;
    }
};

const RequestStatus: FC<{ request: MediaRequest, locale: string, dateTimeLocale: string }> = ({
    request,
    locale,
    dateTimeLocale
}) => {
    let detail: string | undefined;
    if (request.State === RequestState.Queued && request.QueuePosition) {
        detail = translate('RequestQueuePosition', request.QueuePosition);
    } else if (request.State === RequestState.WaitingForSources && request.NextAttemptAt) {
        detail = translate('RequestNextAttempt', new Date(request.NextAttemptAt).toLocaleString(dateTimeLocale));
    } else if (request.Problem) {
        detail = translate(`RequestProblem.${request.Problem.Code}`);
    }

    return (
        <Stack spacing={0.5} sx={{ minWidth: 160 }}>
            <Box>
                <Chip size='small' color={STATE_COLORS[request.State]} label={translate(`RequestState.${request.State}`)} />
            </Box>
            {request.State === RequestState.Downloading && request.Progress != null && (
                <>
                    <LinearProgress
                        variant='determinate'
                        value={Math.round(request.Progress * 100)}
                        aria-label={translate('ColumnProgress')}
                    />
                    <Typography variant='caption'>
                        {request.BytesPerSecond ?
                            translate(
                                'RequestProgressSpeed',
                                formatPercent(request.Progress, locale),
                                formatBytes(request.BytesPerSecond, locale)
                            ) :
                            formatPercent(request.Progress, locale)}
                    </Typography>
                </>
            )}
            {detail && <Typography variant='caption' color='text.secondary'>{detail}</Typography>}
            {request.Problem?.Detail && (
                // The reason given by Radarr, Sonarr or qBittorrent, in their own words: shown as a quote.
                <Typography variant='caption' color='text.secondary' component='q'>{request.Problem.Detail}</Typography>
            )}
        </Stack>
    );
};

/** The queue of every user's requests, live, with the administrator actions. */
const RequestsTable = () => {
    const { locale, dateTimeLocale } = useLocale();
    const mrtTheme = useTableTheme();
    const [ showFinished, setShowFinished ] = useState(false);
    const { data: requests, isPending, isError } = useRequests(!showFinished);
    const { usersById } = useUsersDetails();
    const requestAction = useRequestAction();
    const moveRequest = useMoveRequest();
    const rows = useMemo(() => requests ?? [], [ requests ]);
    const waitingCount = countWaiting(rows);
    const isBusy = requestAction.isPending || moveRequest.isPending;

    const onShowFinishedChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setShowFinished(e.target.checked);
    }, []);

    const onAction = useCallback((requestId: string, action: RequestAction) => {
        moveRequest.reset();
        requestAction.mutate({ requestId, action });
    }, [ moveRequest, requestAction ]);

    const onMove = useCallback((requestId: string, offset: number) => {
        requestAction.reset();
        moveRequest.mutate({ requestId, index: getWaitingIndex(rows, requestId) + offset });
    }, [ moveRequest, requestAction, rows ]);

    const columns = useMemo<MRT_ColumnDef<MediaRequest>[]>(() => [
        {
            id: 'Title',
            accessorFn: getRequestTitle,
            header: translate('ColumnTitle'),
            size: 260
        },
        {
            id: 'User',
            accessorFn: request => usersById[request.UserId]?.Name ?? translate('UnknownUser'),
            header: translate('ColumnUser'),
            filterVariant: 'select'
        },
        {
            id: 'State',
            accessorKey: 'State',
            header: translate('ColumnState'),
            filterVariant: 'select',
            filterSelectOptions: Object.values(RequestState).map(state => ({
                label: translate(`RequestState.${state}`),
                value: state
            })),
            Cell: ({ row }: { row: MRT_Row<MediaRequest> }) => (
                <RequestStatus request={row.original} locale={locale} dateTimeLocale={dateTimeLocale} />
            )
        },
        {
            id: 'Language',
            accessorFn: request => getLanguage(request.ChosenLanguage ?? request.Language, locale),
            header: translate('ColumnLanguage'),
            filterVariant: 'select'
        },
        {
            id: 'CreatedAt',
            accessorFn: request => Date.parse(request.CreatedAt),
            header: translate('ColumnRequestedAt'),
            enableColumnFilter: false,
            Cell: ({ row }) => new Date(row.original.CreatedAt).toLocaleString(dateTimeLocale)
        }
    ], [ dateTimeLocale, locale, usersById ]);

    const table = useMaterialReactTable({
        mrtTheme,
        columns,
        data: rows,
        getRowId: request => request.Id,
        enableFacetedValues: true,
        // The order of the rows is the order of the queue: sorting would hide it.
        enableSorting: false,
        state: { isLoading: isPending },
        initialState: {
            density: 'compact',
            pagination: { pageIndex: 0, pageSize: 50 }
        },
        enableRowActions: true,
        positionActionsColumn: 'last',
        displayColumnDefOptions: {
            'mrt-row-actions': {
                header: '',
                size: 180
            }
        },
        renderTopToolbarCustomActions: () => (
            <FormControlLabel
                control={<Switch checked={showFinished} onChange={onShowFinishedChange} />}
                label={translate('RequestsShowFinished')}
            />
        ),
        renderRowActions: ({ row }) => {
            const request = row.original;
            const actions = getRequestActions(request);
            const waitingIndex = getWaitingIndex(rows, request.Id);
            const buttons: ReactElement[] = [];

            const addButton = (key: string, label: string, icon: ReactElement, onClick: () => void, disabled = false) => {
                buttons.push(
                    <Tooltip key={key} title={label}>
                        <span>
                            <IconButton aria-label={label} onClick={onClick} disabled={isBusy || disabled} size='small'>
                                {icon}
                            </IconButton>
                        </span>
                    </Tooltip>
                );
            };

            if (actions.canMove) {
                addButton('up', translate('ButtonMoveUp'), <ArrowUpward />, () => onMove(request.Id, -1), waitingIndex <= 0);
                addButton('down', translate('ButtonMoveDown'), <ArrowDownward />, () => onMove(request.Id, 1),
                    waitingIndex >= waitingCount - 1);
            }
            if (actions.canApprove) {
                addButton('approve', translate('ButtonApprove'), <Check />, () => onAction(request.Id, RequestAction.Approve));
            }
            if (actions.canReject) {
                addButton('reject', translate('ButtonReject'), <Block />, () => onAction(request.Id, RequestAction.Reject));
            }
            if (actions.canRetry) {
                addButton('retry', translate('ButtonRetry'), <Replay />, () => onAction(request.Id, RequestAction.Retry));
            }
            if (actions.canCancel) {
                addButton('cancel', translate('ButtonCancelRequest'), <Close />, () => onAction(request.Id, RequestAction.Cancel));
            }

            return <Box sx={{ display: 'flex' }}>{buttons}</Box>;
        }
    });

    return (
        <Stack spacing={2}>
            {(requestAction.isError || moveRequest.isError) && (
                <Alert severity='error'>{translate('RequestActionError')}</Alert>
            )}
            {isError ? (
                <Alert severity='error'>{translate('RequestsLoadError')}</Alert>
            ) : (
                <MaterialReactTable table={table} />
            )}
        </Stack>
    );
};

export default RequestsTable;
