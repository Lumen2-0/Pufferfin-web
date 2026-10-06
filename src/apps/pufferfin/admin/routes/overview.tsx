import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import React from 'react';
import { Link } from 'react-router-dom';

import { loadPufferfinStrings, translate } from 'apps/pufferfin/i18n';
import Page from 'components/Page';
import Loading from 'components/loading/LoadingComponent';

import { useConfiguration } from '../api/useConfiguration';
import AutoConfigPanel from '../components/AutoConfigPanel';
import ServiceStatus from '../components/ServiceStatus';
import { getGroupPath, getServiceGroup } from '../constants/groups';

export const loader = async () => {
    await loadPufferfinStrings();
    return null;
};

export const Component = () => {
    const { data: configuration, isPending, isError } = useConfiguration();

    if (isPending) return <Loading />;

    return (
        <Page
            id='pufferfinOverviewPage'
            title={translate('AdminSectionTitle')}
            className='type-interior mainAnimatedPage'
        >
            <Box className='content-primary'>
                <Stack spacing={6}>
                    <Stack spacing={2}>
                        <Typography variant='h1'>{translate('AdminSectionTitle')}</Typography>
                        <Typography variant='body1'>{translate('AdminOverviewIntro')}</Typography>
                    </Stack>

                    {isError || !configuration ? (
                        <Alert severity='error'>{translate('AdminConfigLoadError')}</Alert>
                    ) : (
                        <List disablePadding>
                            {configuration.Services.map(({ Service: service, IsEnabled: isEnabled }) => {
                                const group = getServiceGroup(service);

                                return (
                                    <ListItem
                                        key={service}
                                        divider
                                        disableGutters
                                        sx={{ flexWrap: 'wrap', gap: 2 }}
                                    >
                                        <ListItemText primary={translate(`Service.${service}`)} />
                                        <ServiceStatus service={service} isEnabled={isEnabled} />
                                        {group && (
                                            <Button component={Link} to={getGroupPath(group.id)} size='small'>
                                                {translate('ButtonConfigure')}
                                            </Button>
                                        )}
                                    </ListItem>
                                );
                            })}
                        </List>
                    )}

                    <AutoConfigPanel />
                </Stack>
            </Box>
        </Page>
    );
};

Component.displayName = 'PufferfinOverviewPage';
