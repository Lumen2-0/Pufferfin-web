import Button from '@mui/material/Button/Button';
import React, { FC } from 'react';
import { Link } from 'react-router-dom';

import { useSystemInfo } from 'hooks/useSystemInfo';
// PUFFERFIN: the Pufferfin logo and name in place of the Jellyfin ones
import PufferfinLogo from 'apps/pufferfin/components/PufferfinLogo';
import { translate } from 'apps/pufferfin/i18n';

const ServerButton: FC = () => {
    const {
        data: systemInfo,
        isPending
    } = useSystemInfo();

    return (
        <Button
            variant='text'
            size='large'
            color='inherit'
            startIcon={
                <PufferfinLogo decorative style={{ fontSize: '1.25em' }} />
            }
            component={Link}
            to='/'
        >
            {isPending ? '' : (systemInfo?.ServerName || translate('ProductName'))}
        </Button>
    );
};

export default ServerButton;
