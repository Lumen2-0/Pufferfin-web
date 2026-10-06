import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import React from 'react';

import { loadPufferfinStrings, translate } from 'apps/pufferfin/i18n';
import Page from 'components/Page';
import Loading from 'components/loading/LoadingComponent';

import { useStorage } from '../api/useStorage';
import LibraryTitlesTable from '../components/LibraryTitlesTable';
import RecentPurges from '../components/RecentPurges';
import SeedPolicyPanel from '../components/SeedPolicyPanel';
import StorageDisks from '../components/StorageDisks';
import TorrentsTable from '../components/TorrentsTable';

export const loader = async () => {
    await loadPufferfinStrings();
    return null;
};

export const Component = () => {
    const { data: report, isPending, isError } = useStorage();

    if (isPending) return <Loading />;

    return (
        <Page
            id='pufferfinStoragePage'
            title={translate('AdminStorage')}
            className='type-interior mainAnimatedPage'
        >
            <Box className='content-primary'>
                <Stack spacing={6}>
                    <Stack spacing={2}>
                        <Typography variant='h1'>{translate('AdminStorage')}</Typography>
                        <Typography variant='body1'>{translate('StorageIntro')}</Typography>
                    </Stack>

                    {isError || !report ? (
                        <Alert severity='error'>{translate('StorageLoadError')}</Alert>
                    ) : (
                        <>
                            <StorageDisks report={report} />
                            <SeedPolicyPanel report={report} />
                            <TorrentsTable torrents={report.Torrents} />
                            <RecentPurges purges={report.RecentPurges} />
                        </>
                    )}

                    {/* The library stays deletable even when the storage report cannot be built. */}
                    <LibraryTitlesTable canDeleteImmediately />
                </Stack>
            </Box>
        </Page>
    );
};

Component.displayName = 'PufferfinStoragePage';
