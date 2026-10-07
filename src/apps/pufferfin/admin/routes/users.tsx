import type { UserDto } from '@jellyfin/sdk/lib/generated-client/models/user-dto';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import React, { type FC, useCallback, useState } from 'react';

import { loadPufferfinStrings, translate } from 'apps/pufferfin/i18n';
import Page from 'components/Page';
import Loading from 'components/loading/LoadingComponent';
import { useUsers } from 'hooks/useUsers';

import { usePermissions } from '../api/usePermissions';
import PermissionsDialog from '../components/PermissionsDialog';
import { describePermissions } from '../utils/permissions';

export const loader = async () => {
    await loadPufferfinStrings();
    return null;
};

const UserRights: FC<{ user: UserDto }> = ({ user }) => {
    const userId = user.Id ?? '';
    const name = user.Name ?? '';
    // Administrators have every right, whatever is stored: the server applies the same rule.
    const isAdministrator = !!user.Policy?.IsAdministrator;
    const { data: permissions, isPending, isError } = usePermissions(isAdministrator ? undefined : userId);
    const [ isEditing, setIsEditing ] = useState(false);

    const onEditClick = useCallback(() => setIsEditing(true), []);
    const onDialogClose = useCallback(() => setIsEditing(false), []);

    let secondary: React.ReactNode;
    if (isAdministrator) {
        secondary = translate('PermissionAdministrator');
    } else if (isError) {
        secondary = translate('PermissionsLoadError');
    } else if (permissions) {
        secondary = describePermissions(permissions).map(line => (
            <span key={line} style={{ display: 'block' }}>{line}</span>
        ));
    }

    return (
        <ListItem divider disableGutters sx={{ flexWrap: 'wrap', gap: 2 }}>
            <ListItemText primary={name} secondary={secondary} />
            {!isAdministrator && (
                <Button size='small' variant='outlined' onClick={onEditClick} disabled={isPending || isError}>
                    {translate('ButtonEditRights')}
                </Button>
            )}
            {isEditing && permissions && (
                <PermissionsDialog userId={userId} userName={name} permissions={permissions} onClose={onDialogClose} />
            )}
        </ListItem>
    );
};

export const Component = () => {
    const { data: users, isPending, isError } = useUsers();

    if (isPending) return <Loading />;

    return (
        <Page
            id='pufferfinUsersPage'
            title={translate('AdminUsers')}
            className='type-interior mainAnimatedPage'
        >
            <Box className='content-primary'>
                <Stack spacing={4}>
                    <Stack spacing={2}>
                        <Typography variant='h1'>{translate('AdminUsers')}</Typography>
                        <Typography variant='body1'>{translate('UsersIntro')}</Typography>
                    </Stack>
                    {isError || !users ? (
                        <Alert severity='error'>{translate('UsersLoadError')}</Alert>
                    ) : (
                        <List disablePadding>
                            {users.map(user => <UserRights key={user.Id} user={user} />)}
                        </List>
                    )}
                </Stack>
            </Box>
        </Page>
    );
};

Component.displayName = 'PufferfinUsersPage';
