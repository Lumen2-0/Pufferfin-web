import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import React, { type FC } from 'react';

import type { PurgeRecord } from 'apps/pufferfin/api/types';
import { translate } from 'apps/pufferfin/i18n';
import { useLocale } from 'hooks/useLocale';

/** The torrents Pufferfin removed last, newest first. */
const RecentPurges: FC<{ purges: PurgeRecord[] }> = ({ purges }) => {
    const { dateTimeLocale } = useLocale();

    return (
        <Stack spacing={2} component='section' aria-labelledby='pufferfin-storage-purges'>
            <Typography variant='h2' id='pufferfin-storage-purges'>{translate('StorageRecentPurgesTitle')}</Typography>
            {purges.length === 0 ? (
                <Typography variant='body2' color='text.secondary'>{translate('StoragePurgesEmpty')}</Typography>
            ) : (
                <List dense disablePadding>
                    {purges.map(purge => (
                        <ListItem key={`${purge.Hash}-${purge.At}`} divider disableGutters>
                            <ListItemText
                                primary={purge.Title}
                                secondary={translate(
                                    'StoragePurgeLine',
                                    new Date(purge.At).toLocaleString(dateTimeLocale),
                                    translate(`PurgeReason.${purge.Reason}`)
                                )}
                            />
                        </ListItem>
                    ))}
                </List>
            )}
        </Stack>
    );
};

export default RecentPurges;
