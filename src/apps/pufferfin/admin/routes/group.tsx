import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import React from 'react';
import { useParams } from 'react-router-dom';

import { loadPufferfinStrings, translate } from 'apps/pufferfin/i18n';
import Page from 'components/Page';
import Loading from 'components/loading/LoadingComponent';

import { useConfiguration } from '../api/useConfiguration';
import SettingsForm from '../components/SettingsForm';
import { getSettingsGroup } from '../constants/groups';

export const loader = async () => {
    await loadPufferfinStrings();
    return null;
};

export const Component = () => {
    const { groupId } = useParams();
    const group = getSettingsGroup(groupId);
    const { data: configuration, isPending, isError } = useConfiguration();

    if (group && isPending) return <Loading />;

    let content;
    if (!group) {
        content = <Alert severity='error'>{translate('AdminGroupNotFound')}</Alert>;
    } else if (isError || !configuration) {
        content = <Alert severity='error'>{translate('AdminConfigLoadError')}</Alert>;
    } else {
        // Keyed by page so that switching pages starts from a fresh form.
        content = <SettingsForm key={group.id} group={group} configuration={configuration} />;
    }

    return (
        // Keyed by page: the page title and header are only applied when a page mounts.
        <Page
            key={groupId}
            id='pufferfinSettingsPage'
            title={group ? translate(`Group.${group.id}`) : translate('AdminSectionTitle')}
            className='type-interior mainAnimatedPage'
        >
            <Box className='content-primary'>
                {content}
            </Box>
        </Page>
    );
};

Component.displayName = 'PufferfinSettingsPage';
