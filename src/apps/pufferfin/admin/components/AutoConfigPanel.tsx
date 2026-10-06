import Sync from '@mui/icons-material/Sync';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip, { type ChipProps } from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import React, { useCallback } from 'react';

import { AutoConfigStepStatus } from 'apps/pufferfin/api/types';
import { translate } from 'apps/pufferfin/i18n';
import { useLocale } from 'hooks/useLocale';

import { useAutoConfig, useRunAutoConfig } from '../api/useAutoConfig';

const STEP_COLORS: Record<AutoConfigStepStatus, ChipProps['color']> = {
    [AutoConfigStepStatus.Applied]: 'success',
    [AutoConfigStepStatus.Unchanged]: 'default',
    [AutoConfigStepStatus.Skipped]: 'default',
    [AutoConfigStepStatus.Failed]: 'error'
};

/** The last automatic configuration run, and a button to replay it now. */
const AutoConfigPanel = () => {
    const { dateTimeLocale } = useLocale();
    const { data: lastRun, isPending, isError } = useAutoConfig();
    const runAutoConfig = useRunAutoConfig();

    const onRunClick = useCallback(() => {
        runAutoConfig.mutate();
    }, [ runAutoConfig ]);

    let summary;
    if (isPending) {
        summary = null;
    } else if (isError) {
        summary = <Alert severity='error'>{translate('AutoConfigLoadError')}</Alert>;
    } else if (!lastRun) {
        summary = <Typography variant='body2'>{translate('AutoConfigNever')}</Typography>;
    } else {
        const completedAt = new Date(lastRun.CompletedAt).toLocaleString(dateTimeLocale);
        summary = (
            <>
                <Typography variant='body2'>
                    {translate('AutoConfigLastRun', translate(
                        'AutoConfigRunTrigger',
                        completedAt,
                        translate(`AutoConfigTrigger.${lastRun.Trigger}`)
                    ))}
                </Typography>
                {lastRun.Steps.length === 0 ? (
                    <Typography variant='body2' color='text.secondary'>{translate('AutoConfigNoSteps')}</Typography>
                ) : (
                    <List dense disablePadding>
                        {lastRun.Steps.map(step => (
                            <ListItem key={step.Name} disableGutters>
                                <ListItemText primary={step.Name} />
                                <Chip
                                    size='small'
                                    color={STEP_COLORS[step.Status]}
                                    label={translate(`AutoConfigStep.${step.Status}`)}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </>
        );
    }

    return (
        <Stack spacing={3} component='section' aria-labelledby='pufferfin-autoconfig-title'>
            <Typography variant='h2' id='pufferfin-autoconfig-title'>{translate('AutoConfigTitle')}</Typography>
            <Typography variant='body1'>{translate('AutoConfigHelp')}</Typography>
            {summary}
            {runAutoConfig.isError && (
                <Alert severity='error'>{translate('AutoConfigRunError')}</Alert>
            )}
            <Stack direction='row'>
                <Button
                    variant='outlined'
                    startIcon={<Sync />}
                    onClick={onRunClick}
                    disabled={runAutoConfig.isPending}
                >
                    {translate('ButtonRunAutoConfig')}
                </Button>
            </Stack>
        </Stack>
    );
};

export default AutoConfigPanel;
