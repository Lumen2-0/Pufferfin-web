import { getDisplayVersion } from '@jellyfin/sdk/lib/utils/versioning';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import React from 'react';

import { useSystemInfo } from 'hooks/useSystemInfo';
import ListItemLink from 'components/ListItemLink';
// PUFFERFIN: the Pufferfin logo and name in place of the Jellyfin ones
import PufferfinLogo from 'apps/pufferfin/components/PufferfinLogo';
import { translate } from 'apps/pufferfin/i18n';

const DrawerHeaderLink = () => {
    const { data: systemInfo } = useSystemInfo();

    return (
        <ListItemLink to='/'>
            <ListItemIcon sx={{ minWidth: 56 }}>
                <PufferfinLogo decorative style={{ fontSize: '2.5rem' }} />
            </ListItemIcon>
            <ListItemText
                primary={systemInfo?.ServerName || translate('ProductName')}
                secondary={getDisplayVersion(systemInfo?.Version)}
                slotProps={{
                    primary: { variant: 'h6' }
                }}
            />
        </ListItemLink>);
};

export default DrawerHeaderLink;
