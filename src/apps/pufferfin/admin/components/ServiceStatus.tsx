import Button from '@mui/material/Button';
import Chip, { type ChipProps } from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import React, { type FC, useCallback } from 'react';

import { ConnectionStatus, type PufferfinService } from 'apps/pufferfin/api/types';
import { type PufferfinStringKey, translate } from 'apps/pufferfin/i18n';

import { useConnectionTest } from '../api/useConnectionTest';
import { CheckCircle, CloudOff, KeyOff, NetworkCheck, RemoveCircleOutline, WarningAmber } from '../../components/icons';

type StatusState = 'Disabled' | 'Testing' | 'Connected' | 'Unreachable' | 'KeyRejected' | 'TestFailed';

const STATUS_DISPLAY: Record<StatusState, { label: PufferfinStringKey, color: ChipProps['color'], icon: React.ReactElement }> = {
    Disabled: { label: 'ServiceStatus.Disabled', color: 'default', icon: <RemoveCircleOutline /> },
    Testing: { label: 'ServiceStatus.Testing', color: 'default', icon: <CircularProgress size={16} color='inherit' /> },
    Connected: { label: 'ServiceStatus.Connected', color: 'success', icon: <CheckCircle /> },
    Unreachable: { label: 'ServiceStatus.Unreachable', color: 'error', icon: <CloudOff /> },
    KeyRejected: { label: 'ServiceStatus.KeyRejected', color: 'error', icon: <KeyOff /> },
    TestFailed: { label: 'ServiceStatus.TestFailed', color: 'warning', icon: <WarningAmber /> }
};

interface ServiceStatusProps {
    service: PufferfinService;
    isEnabled: boolean;
}

/**
 * The state of a service, from an on demand connection test, and the button that runs the test again.
 * A service that is not configured is reported as disabled, not as an error.
 */
const ServiceStatus: FC<ServiceStatusProps> = ({ service, isEnabled }) => {
    const { data: result, isFetching, isError, refetch } = useConnectionTest(service, isEnabled);

    const onTestClick = useCallback(() => {
        void refetch();
    }, [ refetch ]);

    let state: StatusState;
    if (!isEnabled || result?.Status === ConnectionStatus.NotConfigured) {
        state = 'Disabled';
    } else if (isFetching) {
        state = 'Testing';
    } else if (isError || !result) {
        state = 'TestFailed';
    } else {
        state = result.Status;
    }

    const display = STATUS_DISPLAY[state];
    const label = translate(display.label);

    return (
        <Stack direction='row' spacing={2} alignItems='center' role='status'>
            <Chip
                size='small'
                color={display.color}
                icon={display.icon}
                label={label}
                aria-label={translate('ServiceStatus.Label', translate(`Service.${service}`), label)}
            />
            {isEnabled && (
                <Button
                    size='small'
                    variant='outlined'
                    startIcon={<NetworkCheck />}
                    onClick={onTestClick}
                    disabled={isFetching}
                >
                    {translate('ButtonTestConnection')}
                </Button>
            )}
        </Stack>
    );
};

export default ServiceStatus;
