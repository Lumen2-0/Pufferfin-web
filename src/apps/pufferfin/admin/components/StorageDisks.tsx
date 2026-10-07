import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import React, { type FC, useCallback } from 'react';

import { type DiskUsage, HardlinkStatus, StorageAdviceCode, type StorageReport } from 'apps/pufferfin/api/types';
import { translate } from 'apps/pufferfin/i18n';
import { useLocale } from 'hooks/useLocale';

import { useRefreshStorage } from '../api/useStorage';
import { formatBytes } from '../utils/format';

const Disk: FC<{ disk: DiskUsage, locale: string }> = ({ disk, locale }) => {
    const role = translate(`StorageRole.${disk.Role}`);

    return (
        <ListItem divider disableGutters sx={{ display: 'block' }}>
            <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 1 }}>
                <Typography variant='h3' component='span'>{role}</Typography>
                <Typography variant='body2' color='text.secondary' component='code'>{disk.Path}</Typography>
                {disk.Available && disk.AboveWarning && (
                    <Chip size='small' color='warning' label={translate('StorageDiskAboveWarning')} />
                )}
            </Stack>
            {disk.Available ? (
                <>
                    <LinearProgress
                        variant='determinate'
                        value={Math.min(100, Math.max(0, disk.UsedPercent))}
                        color={disk.AboveWarning ? 'warning' : 'primary'}
                        aria-label={translate('StorageDiskUsageLabel', role)}
                    />
                    <Typography variant='body2' sx={{ mt: 1 }}>
                        {translate(
                            'StorageDiskUsage',
                            formatBytes(disk.TotalBytes - disk.FreeBytes, locale),
                            formatBytes(disk.TotalBytes, locale),
                            formatBytes(disk.FreeBytes, locale)
                        )}
                    </Typography>
                </>
            ) : (
                <Typography variant='body2' color='text.secondary'>{translate('StorageDiskUnavailable')}</Typography>
            )}
        </ListItem>
    );
};

const ContentLine: FC<{ label: string, help: string }> = ({ label, help }) => (
    <ListItem disableGutters>
        <ListItemText primary={label} secondary={help} />
    </ListItem>
);

/** The disks, the advice, and how much space seeding takes. */
const StorageDisks: FC<{ report: StorageReport }> = ({ report }) => {
    const { locale } = useLocale();
    const refreshStorage = useRefreshStorage();
    const { Content: content } = report;

    const onCheckClick = useCallback(() => {
        refreshStorage.mutate();
    }, [ refreshStorage ]);

    return (
        <Stack spacing={4}>
            {report.Advice.map(advice => (
                <Alert key={advice.Code} severity={advice.Code === StorageAdviceCode.DiskAlmostFull ? 'warning' : 'info'}>
                    {translate(`StorageAdvice.${advice.Code}`)}
                </Alert>
            ))}

            <Stack spacing={2} component='section' aria-labelledby='pufferfin-storage-disks'>
                <Typography variant='h2' id='pufferfin-storage-disks'>{translate('StorageDisksTitle')}</Typography>
                <List disablePadding>
                    {report.Disks.map(disk => <Disk key={disk.Role} disk={disk} locale={locale} />)}
                </List>
                <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap'>
                    <Typography variant='body2'>{translate(`StorageHardlinks.${report.Hardlinks.Status}`)}</Typography>
                    <Button size='small' variant='outlined' onClick={onCheckClick} disabled={refreshStorage.isPending}>
                        {translate('ButtonCheckHardlinks')}
                    </Button>
                </Stack>
                {refreshStorage.isError && <Alert severity='error'>{translate('StorageLoadError')}</Alert>}
            </Stack>

            <Stack spacing={2} component='section' aria-labelledby='pufferfin-storage-content'>
                <Typography variant='h2' id='pufferfin-storage-content'>{translate('StorageContentTitle')}</Typography>
                <List dense disablePadding>
                    <ContentLine
                        label={translate('StorageContentTotal', formatBytes(content.TorrentBytes, locale))}
                        help={translate('StorageContentTotalHelp')}
                    />
                    <ContentLine
                        label={translate('StorageContentShared', formatBytes(content.SharedWithLibraryBytes, locale))}
                        help={translate('StorageContentSharedHelp')}
                    />
                    <ContentLine
                        label={translate('StorageContentSeedingOnly', formatBytes(content.SeedingOnlyBytes, locale))}
                        help={translate('StorageContentSeedingOnlyHelp')}
                    />
                    {content.UnknownBytes > 0 && (
                        <ContentLine
                            label={translate('StorageContentUnknown', formatBytes(content.UnknownBytes, locale))}
                            help={translate('StorageContentUnknownHelp')}
                        />
                    )}
                </List>
                {report.Hardlinks.Status === HardlinkStatus.Impossible && content.SeedingOnlyBytes > 0 && (
                    <Typography variant='body2' color='text.secondary'>{translate('StorageContentNoHardlinks')}</Typography>
                )}
            </Stack>
        </Stack>
    );
};

export default StorageDisks;
