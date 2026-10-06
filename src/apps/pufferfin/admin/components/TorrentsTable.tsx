import Chip, { type ChipProps } from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { MaterialReactTable, type MRT_ColumnDef, type MRT_Row, useMaterialReactTable } from 'material-react-table';
import React, { type FC, useMemo } from 'react';

import { SeedState, type TorrentSeedState } from 'apps/pufferfin/api/types';
import { translate } from 'apps/pufferfin/i18n';
import { useLocale } from 'hooks/useLocale';

import { formatBytes, formatDays, formatRatio, parseTimeSpanDays } from '../utils/format';
import { useTableTheme } from './useTableTheme';

const STATE_COLORS: Record<SeedState, ChipProps['color']> = {
    [SeedState.Downloading]: 'info',
    [SeedState.Protected]: 'default',
    [SeedState.Seeding]: 'success',
    [SeedState.WaitingForRelease]: 'warning',
    [SeedState.DueForPurge]: 'default'
};

const getPrivacyLabel = (isPrivate: boolean | null | undefined) => {
    if (isPrivate == null) return translate('TorrentPrivacyUnknown');
    return translate(isPrivate ? 'TorrentPrivate' : 'TorrentPublic');
};

const getSpaceLabel = (sharesSpace: boolean | null | undefined) => {
    if (sharesSpace == null) return translate('TorrentSpaceUnknown');
    return translate(sharesSpace ? 'TorrentSharesSpace' : 'TorrentOwnSpace');
};

/**
 * Every torrent the seeding policy manages, with search, filters and sorting. Torrents whose title was deleted
 * but that keep seeding until their minimum are "waiting for release".
 */
const TorrentsTable: FC<{ torrents: TorrentSeedState[] }> = ({ torrents }) => {
    const { locale, dateTimeLocale } = useLocale();
    const mrtTheme = useTableTheme();

    const columns = useMemo<MRT_ColumnDef<TorrentSeedState>[]>(() => [
        {
            id: 'Title',
            accessorKey: 'Title',
            header: translate('ColumnTitle'),
            size: 300
        },
        {
            id: 'State',
            accessorKey: 'State',
            header: translate('ColumnState'),
            filterVariant: 'select',
            filterSelectOptions: Object.values(SeedState).map(state => ({
                label: translate(`SeedState.${state}`),
                value: state
            })),
            Cell: ({ row }: { row: MRT_Row<TorrentSeedState> }) => (
                <Chip
                    size='small'
                    color={STATE_COLORS[row.original.State]}
                    label={translate(`SeedState.${row.original.State}`)}
                />
            )
        },
        {
            id: 'Category',
            accessorFn: torrent => torrent.Category ?? '',
            header: translate('ColumnCategory'),
            filterVariant: 'select'
        },
        {
            id: 'Size',
            accessorKey: 'SizeBytes',
            header: translate('ColumnSize'),
            enableColumnFilter: false,
            Cell: ({ row }) => formatBytes(row.original.SizeBytes, locale)
        },
        {
            id: 'Ratio',
            accessorKey: 'Ratio',
            header: translate('ColumnRatio'),
            enableColumnFilter: false,
            Cell: ({ row }) => formatRatio(row.original.Ratio, locale)
        },
        {
            id: 'SeedingTime',
            accessorFn: torrent => parseTimeSpanDays(torrent.SeedingTime),
            header: translate('ColumnSeedingTime'),
            enableColumnFilter: false,
            Cell: ({ cell }) => formatDays(cell.getValue<number>(), locale)
        },
        {
            id: 'ProtectedUntil',
            accessorFn: torrent => (torrent.ProtectedUntil ? Date.parse(torrent.ProtectedUntil) : 0),
            header: translate('ColumnProtectedUntil'),
            enableColumnFilter: false,
            Cell: ({ row }) => (row.original.ProtectedUntil ?
                new Date(row.original.ProtectedUntil).toLocaleString(dateTimeLocale) :
                '')
        },
        {
            id: 'Private',
            accessorFn: torrent => getPrivacyLabel(torrent.IsPrivate),
            header: translate('ColumnPrivate'),
            filterVariant: 'select'
        },
        {
            id: 'Space',
            accessorFn: torrent => getSpaceLabel(torrent.SharesSpaceWithLibrary),
            header: translate('ColumnSpace'),
            filterVariant: 'select'
        }
    ], [ dateTimeLocale, locale ]);

    const table = useMaterialReactTable({
        mrtTheme,
        columns,
        data: torrents,
        getRowId: torrent => torrent.Hash,
        enableColumnResizing: true,
        enableFacetedValues: true,
        initialState: {
            density: 'compact',
            showColumnFilters: true,
            sorting: [ { id: 'Size', desc: true } ],
            pagination: { pageIndex: 0, pageSize: 25 }
        }
    });

    return (
        <Stack spacing={2} component='section' aria-labelledby='pufferfin-storage-torrents'>
            <Typography variant='h2' id='pufferfin-storage-torrents'>{translate('StorageTorrentsTitle')}</Typography>
            <Typography variant='body1'>{translate('StorageTorrentsHelp')}</Typography>
            <MaterialReactTable table={table} />
        </Stack>
    );
};

export default TorrentsTable;
