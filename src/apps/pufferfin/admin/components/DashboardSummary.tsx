import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import React from 'react';
import { Link } from 'react-router-dom';

import { RequestState } from 'apps/pufferfin/api/types';
import { translate } from 'apps/pufferfin/i18n';

import { useRequests } from '../api/useRequests';
import { useStorage } from '../api/useStorage';
import { AdminPageId, getAdminPagePath } from '../constants/pages';
import SeedPolicyPanel from './SeedPolicyPanel';

const IN_PROGRESS_STATES = new Set([
    RequestState.Queued,
    RequestState.Searching,
    RequestState.WaitingForSources,
    RequestState.Downloading,
    RequestState.Importing
]);

/** The queue, the seeding policy and the rights, at a glance, with links to their pages. */
const DashboardSummary = () => {
    const { data: requests, isError: isRequestsError } = useRequests(true);
    const { data: report, isError: isStorageError } = useStorage();

    const pendingApproval = requests?.filter(mediaRequest => mediaRequest.State === RequestState.PendingApproval).length ?? 0;
    const inProgress = requests?.filter(mediaRequest => IN_PROGRESS_STATES.has(mediaRequest.State)).length ?? 0;
    const failed = requests?.filter(mediaRequest => mediaRequest.State === RequestState.Failed).length ?? 0;

    return (
        <Stack spacing={6}>
            <Stack spacing={2} component='section' aria-labelledby='pufferfin-dashboard-requests'>
                <Typography variant='h2' id='pufferfin-dashboard-requests'>{translate('AdminRequests')}</Typography>
                {isRequestsError ? (
                    <Alert severity='error'>{translate('RequestsLoadError')}</Alert>
                ) : (
                    <List dense disablePadding>
                        <ListItem disableGutters>
                            <ListItemText primary={translate('DashboardPendingApproval', pendingApproval)} />
                        </ListItem>
                        <ListItem disableGutters>
                            <ListItemText primary={translate('DashboardInProgress', inProgress)} />
                        </ListItem>
                        <ListItem disableGutters>
                            <ListItemText primary={translate('DashboardFailed', failed)} />
                        </ListItem>
                    </List>
                )}
                <Stack direction='row' spacing={2}>
                    <Button variant='outlined' component={Link} to={getAdminPagePath(AdminPageId.Requests)}>
                        {translate('ButtonOpenRequests')}
                    </Button>
                    <Button variant='outlined' component={Link} to={getAdminPagePath(AdminPageId.Users)}>
                        {translate('ButtonOpenUsers')}
                    </Button>
                </Stack>
            </Stack>

            {isStorageError && <Alert severity='error'>{translate('StorageLoadError')}</Alert>}
            {report && (
                <Stack spacing={2}>
                    <SeedPolicyPanel report={report} canRun={false} />
                    <div>
                        <Button variant='outlined' component={Link} to={getAdminPagePath(AdminPageId.Storage)}>
                            {translate('ButtonOpenStorage')}
                        </Button>
                    </div>
                </Stack>
            )}
        </Stack>
    );
};

export default DashboardSummary;
