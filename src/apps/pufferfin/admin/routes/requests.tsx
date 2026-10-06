import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import React from 'react';

import { loadPufferfinStrings, translate } from 'apps/pufferfin/i18n';
import Page from 'components/Page';

import RequestsTable from '../components/RequestsTable';

export const loader = async () => {
    await loadPufferfinStrings();
    return null;
};

export const Component = () => (
    <Page
        id='pufferfinRequestsPage'
        title={translate('AdminRequests')}
        className='type-interior mainAnimatedPage'
    >
        <Box className='content-primary'>
            <Stack spacing={4}>
                <Stack spacing={2}>
                    <Typography variant='h1'>{translate('AdminRequests')}</Typography>
                    <Typography variant='body1'>{translate('RequestsIntro')}</Typography>
                </Stack>
                <RequestsTable />
            </Stack>
        </Box>
    </Page>
);

Component.displayName = 'PufferfinRequestsPage';
