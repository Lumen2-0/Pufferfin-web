import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import React, { type FC, useCallback } from 'react';
import { Link } from 'react-router-dom';

import { SeedCycleStatus, type StorageReport } from 'apps/pufferfin/api/types';
import { translate } from 'apps/pufferfin/i18n';
import { useLocale } from 'hooks/useLocale';

import { useRunSeedPolicy } from '../api/useStorage';
import { getGroupPath, SettingsGroupId } from '../constants/groups';
import { formatDays, formatRatio } from '../utils/format';

const CYCLE_SEVERITIES = {
    [SeedCycleStatus.Completed]: 'success',
    [SeedCycleStatus.Skipped]: 'info',
    [SeedCycleStatus.Failed]: 'warning'
} as const;

interface SeedPolicyPanelProps {
    report: StorageReport;
    /** Whether to offer to run the policy now. */
    canRun?: boolean;
}

/** The seeding policy in force, when it last ran, and a button to run it now. */
const SeedPolicyPanel: FC<SeedPolicyPanelProps> = ({ report, canRun = true }) => {
    const { locale, dateTimeLocale } = useLocale();
    const runSeedPolicy = useRunSeedPolicy();
    const { Policy: policy } = report;

    const onRunClick = useCallback(() => {
        runSeedPolicy.mutate();
    }, [ runSeedPolicy ]);

    const formatDate = (date: string) => new Date(date).toLocaleString(dateTimeLocale);
    const result = runSeedPolicy.data;

    return (
        <Stack spacing={2} component='section' aria-labelledby='pufferfin-seed-policy'>
            <Typography variant='h2' id='pufferfin-seed-policy'>{translate('SeedPolicyTitle')}</Typography>
            <List dense disablePadding>
                <ListItem disableGutters>
                    <ListItemText primary={translate('SeedPolicyMinDays', formatDays(policy.MinDays, locale))} />
                </ListItem>
                <ListItem disableGutters>
                    <ListItemText
                        primary={policy.TargetRatio == null ?
                            translate('SeedPolicyNoTargetRatio') :
                            translate('SeedPolicyTargetRatio', formatRatio(policy.TargetRatio, locale))}
                    />
                </ListItem>
                <ListItem disableGutters>
                    <ListItemText
                        primary={policy.MaxDays == null ?
                            translate('SeedPolicyNoMaxDays') :
                            translate('SeedPolicyMaxDays', formatDays(policy.MaxDays, locale))}
                    />
                </ListItem>
                <ListItem disableGutters>
                    <ListItemText
                        primary={policy.Categories.length ?
                            translate('SeedPolicyCategories', policy.Categories.join(', ')) :
                            translate('SeedPolicyNoCategories')}
                    />
                </ListItem>
            </List>
            <Typography variant='body2'>
                {report.LastCycleAt ?
                    translate('SeedPolicyLastCycle', formatDate(report.LastCycleAt)) :
                    translate('SeedPolicyNeverRun')}
                <br />
                {translate('SeedPolicyNextCycle', formatDate(report.NextCycleAt))}
            </Typography>

            {result && (
                <Alert severity={CYCLE_SEVERITIES[result.Status]}>
                    {result.Status === SeedCycleStatus.Completed ?
                        translate('SeedCycle.Completed', result.Purged.length, result.Protected, result.WaitingForImport) :
                        translate(`SeedCycle.${result.Status}`)}
                </Alert>
            )}
            {runSeedPolicy.isError && <Alert severity='error'>{translate('SeedCycleRunError')}</Alert>}

            <Stack direction='row' spacing={2}>
                {canRun && (
                    <Button variant='contained' onClick={onRunClick} disabled={runSeedPolicy.isPending}>
                        {translate('ButtonRunSeedPolicy')}
                    </Button>
                )}
                <Button variant='outlined' component={Link} to={getGroupPath(SettingsGroupId.Behavior)}>
                    {translate('ButtonEditSeedPolicy')}
                </Button>
            </Stack>
        </Stack>
    );
};

export default SeedPolicyPanel;
