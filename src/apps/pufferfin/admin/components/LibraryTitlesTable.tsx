import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
    MaterialReactTable,
    type MRT_ColumnDef,
    type MRT_PaginationState,
    type MRT_SortingState,
    useMaterialReactTable
} from 'material-react-table';
import React, { type FC, useCallback, useMemo, useState } from 'react';

import type { DeletionOutcome } from 'apps/pufferfin/api/types';
import { translate } from 'apps/pufferfin/i18n';
import { useLocale } from 'hooks/useLocale';

import { DELETABLE_KINDS, type DeletableKind, useLibraryTitles } from '../api/useLibraryTitles';
import { countKeptUntilMinimum } from '../utils/deletion';
import DeleteTitleDialog, { type DeletableTitle } from './DeleteTitleDialog';
import { useTableTheme } from './useTableTheme';
import { Delete as DeleteIcon } from '../../components/icons';

const ALL_KINDS = 'all';

// The columns the server can sort by, and the sort field it uses for each.
const SORT_FIELDS: Record<string, ItemSortBy> = {
    Name: ItemSortBy.SortName,
    Added: ItemSortBy.DateCreated,
    Year: ItemSortBy.ProductionYear
};

interface LibraryTitlesTableProps {
    /** Whether the immediate mode is offered. */
    canDeleteImmediately: boolean;
}

/** The titles of the library, searched, filtered and sorted by the server, each with a delete action. */
const LibraryTitlesTable: FC<LibraryTitlesTableProps> = ({ canDeleteImmediately }) => {
    const { dateTimeLocale } = useLocale();
    const mrtTheme = useTableTheme();
    const [ searchTerm, setSearchTerm ] = useState('');
    const [ kind, setKind ] = useState<DeletableKind | typeof ALL_KINDS>(ALL_KINDS);
    const [ sorting, setSorting ] = useState<MRT_SortingState>([ { id: 'Name', desc: false } ]);
    const [ pagination, setPagination ] = useState<MRT_PaginationState>({ pageIndex: 0, pageSize: 25 });
    const [ titleToDelete, setTitleToDelete ] = useState<DeletableTitle>();
    const [ lastDeletion, setLastDeletion ] = useState<{ title: DeletableTitle, outcome: DeletionOutcome }>();

    const sort = sorting[0];
    const { data, isPending, isFetching, isError } = useLibraryTitles({
        searchTerm,
        kinds: kind === ALL_KINDS ? [] : [ kind ],
        sortBy: SORT_FIELDS[sort?.id] ?? ItemSortBy.SortName,
        descending: !!sort?.desc,
        startIndex: pagination.pageIndex * pagination.pageSize,
        limit: pagination.pageSize
    });

    const onSearchChange = useCallback((value: string | undefined) => {
        setSearchTerm(value ?? '');
        setPagination(current => ({ ...current, pageIndex: 0 }));
    }, []);

    const onKindChange = useCallback((e: SelectChangeEvent) => {
        setKind(e.target.value as DeletableKind | typeof ALL_KINDS);
        setPagination(current => ({ ...current, pageIndex: 0 }));
    }, []);

    const onDialogClose = useCallback(() => setTitleToDelete(undefined), []);

    const onDeletionAlertClose = useCallback(() => setLastDeletion(undefined), []);

    const onDeleted = useCallback((title: DeletableTitle, outcome: DeletionOutcome) => {
        setTitleToDelete(undefined);
        setLastDeletion({ title, outcome });
    }, []);

    const columns = useMemo<MRT_ColumnDef<BaseItemDto>[]>(() => [
        {
            id: 'Name',
            accessorFn: item => item.Name ?? '',
            header: translate('ColumnTitle'),
            size: 300
        },
        {
            id: 'Kind',
            accessorFn: item => (item.Type ? translate(`ItemKind.${item.Type as DeletableKind}`) : ''),
            header: translate('ColumnKind'),
            enableSorting: false
        },
        {
            id: 'Year',
            accessorFn: item => item.ProductionYear ?? '',
            header: translate('ColumnYear')
        },
        {
            id: 'Added',
            accessorFn: item => (item.DateCreated ? new Date(item.DateCreated).toLocaleDateString(dateTimeLocale) : ''),
            header: translate('ColumnAdded')
        }
    ], [ dateTimeLocale ]);

    const table = useMaterialReactTable({
        mrtTheme,
        columns,
        data: data?.items ?? [],
        getRowId: item => item.Id ?? '',
        rowCount: data?.totalCount ?? 0,

        manualFiltering: true,
        manualPagination: true,
        manualSorting: true,
        enableColumnFilters: false,
        enableMultiSort: false,
        enableSortingRemoval: false,
        onGlobalFilterChange: onSearchChange,
        onPaginationChange: setPagination,
        onSortingChange: setSorting,

        state: {
            globalFilter: searchTerm,
            pagination,
            sorting,
            isLoading: isPending,
            showProgressBars: isFetching
        },
        initialState: {
            density: 'compact',
            showGlobalFilter: true
        },

        enableRowActions: true,
        positionActionsColumn: 'last',
        displayColumnDefOptions: {
            'mrt-row-actions': {
                header: '',
                size: 25
            }
        },
        renderTopToolbarCustomActions: () => (
            <FormControl size='small' sx={{ minWidth: 200 }}>
                <InputLabel id='pufferfin-library-kind'>{translate('FilterKind')}</InputLabel>
                <Select labelId='pufferfin-library-kind' label={translate('FilterKind')} value={kind} onChange={onKindChange}>
                    <MenuItem value={ALL_KINDS}>{translate('FilterKindAll')}</MenuItem>
                    {DELETABLE_KINDS.map(value => (
                        <MenuItem key={value} value={value}>{translate(`ItemKind.${value}`)}</MenuItem>
                    ))}
                </Select>
            </FormControl>
        ),
        renderRowActions: ({ row }) => (
            <Tooltip title={translate('ButtonDelete')}>
                <IconButton
                    color='error'
                    aria-label={translate('DeleteTitleDialogTitle', row.original.Name ?? '')}
                    // eslint-disable-next-line react/jsx-no-bind
                    onClick={() => row.original.Id && setTitleToDelete({ id: row.original.Id, name: row.original.Name ?? '' })}
                >
                    <DeleteIcon />
                </IconButton>
            </Tooltip>
        )
    });

    const keptCount = countKeptUntilMinimum(lastDeletion?.outcome);

    return (
        <Stack spacing={2} component='section' aria-labelledby='pufferfin-storage-library'>
            <Typography variant='h2' id='pufferfin-storage-library'>{translate('StorageLibraryTitle')}</Typography>
            <Typography variant='body1'>{translate('StorageLibraryHelp')}</Typography>
            {lastDeletion && (
                <Alert severity='success' onClose={onDeletionAlertClose}>
                    {keptCount > 0 ?
                        translate('DeletionDoneWaiting', lastDeletion.title.name, keptCount) :
                        translate('DeletionDone', lastDeletion.title.name)}
                </Alert>
            )}
            {isError ? (
                <Alert severity='error'>{translate('StorageLibraryLoadError')}</Alert>
            ) : (
                <MaterialReactTable table={table} />
            )}
            {titleToDelete && (
                <DeleteTitleDialog
                    title={titleToDelete}
                    canDeleteImmediately={canDeleteImmediately}
                    onClose={onDialogClose}
                    onDeleted={onDeleted}
                />
            )}
        </Stack>
    );
};

export default LibraryTitlesTable;
