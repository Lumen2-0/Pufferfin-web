import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { isAxiosError } from 'axios';
import React, { type FC, type FormEvent, useCallback, useMemo, useState } from 'react';

import type { PufferfinConfiguration, PufferfinSetting, ValidationProblem } from 'apps/pufferfin/api/types';
import { type PufferfinStringKey, translate } from 'apps/pufferfin/i18n';

import { useUpdateConfiguration } from '../api/useUpdateConfiguration';
import type { SettingsGroup } from '../constants/groups';
import { buildUpdate, clearSecretDrafts, type Drafts, type FieldErrors, toDrafts, toServerFieldErrors, validateUpdate } from '../utils/form';
import ServiceStatus from './ServiceStatus';
import SettingField from './SettingField';

const HTTP_BAD_REQUEST = 400;

type SaveResult = 'saved' | 'noChanges' | 'invalid' | 'error';

const SAVE_RESULT_DISPLAY: Record<SaveResult, { severity: 'success' | 'info' | 'error', message: PufferfinStringKey }> = {
    saved: { severity: 'success', message: 'SettingsSaved' },
    noChanges: { severity: 'info', message: 'SettingsNoChanges' },
    invalid: { severity: 'error', message: 'SettingsInvalid' },
    error: { severity: 'error', message: 'SettingsSaveError' }
};

interface SettingsFormProps {
    group: SettingsGroup;
    configuration: PufferfinConfiguration;
}

/** The settings of one configuration page: its services, each with its state, then the general settings. */
const SettingsForm: FC<SettingsFormProps> = ({ group, configuration }) => {
    const updateConfiguration = useUpdateConfiguration();

    const services = useMemo(() => group.services.map(service => ({
        service,
        isEnabled: configuration.Services.find(state => state.Service === service)?.IsEnabled ?? false,
        settings: configuration.Settings.filter(setting => setting.Service === service)
    })), [ configuration, group ]);

    const generalSettings = useMemo(() => (
        group.settings
            .map(key => configuration.Settings.find(setting => setting.Key === key))
            .filter((setting): setting is PufferfinSetting => !!setting)
    ), [ configuration, group ]);

    const settings = useMemo(() => services.reduce<PufferfinSetting[]>(
        (all, entry) => all.concat(entry.settings),
        []
    ).concat(generalSettings), [ generalSettings, services ]);

    // Secret fields hold a new value only until the form is submitted.
    const [ drafts, setDrafts ] = useState<Drafts>(() => toDrafts(settings));
    const [ clearedSecrets, setClearedSecrets ] = useState<string[]>([]);
    const [ errors, setErrors ] = useState<FieldErrors>({});
    const [ saveResult, setSaveResult ] = useState<SaveResult>();

    const onFieldChange = useCallback((key: string, value: string) => {
        setDrafts(current => ({ ...current, [key]: value }));
        setErrors(current => {
            const next = { ...current };
            delete next[key];
            return next;
        });
        setSaveResult(undefined);
    }, []);

    const onClearChange = useCallback((key: string, isCleared: boolean) => {
        setClearedSecrets(current => (isCleared ? [ ...current, key ] : current.filter(item => item !== key)));
        setSaveResult(undefined);
    }, []);

    const onSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const update = buildUpdate(settings, drafts, clearedSecrets);
        if (Object.keys(update).length === 0) {
            setSaveResult('noChanges');
            return;
        }

        const validationErrors = validateUpdate(settings, update);
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) {
            setSaveResult('invalid');
            return;
        }

        setSaveResult(undefined);
        updateConfiguration.mutate({ Settings: update }, {
            onSuccess: (saved) => {
                const keys = settings.map(setting => setting.Key);
                setDrafts(toDrafts(saved.Settings.filter(setting => keys.includes(setting.Key))));
                setSaveResult('saved');
            },
            onError: (error) => {
                if (isAxiosError<ValidationProblem>(error) && error.response?.status === HTTP_BAD_REQUEST) {
                    setErrors(toServerFieldErrors(error.response.data?.errors, settings.map(setting => setting.Key)));
                    setSaveResult('invalid');
                } else {
                    setSaveResult('error');
                }
            },
            onSettled: () => {
                // A new secret must not outlive its submission, in the form or in the mutation state.
                setDrafts(current => clearSecretDrafts(current, settings));
                setClearedSecrets([]);
                updateConfiguration.reset();
            }
        });
    }, [ clearedSecrets, drafts, settings, updateConfiguration ]);

    const isSubmitting = updateConfiguration.isPending;

    const renderField = (setting: PufferfinSetting) => (
        <SettingField
            key={setting.Key}
            setting={setting}
            value={drafts[setting.Key]}
            error={errors[setting.Key]}
            isCleared={clearedSecrets.includes(setting.Key)}
            disabled={isSubmitting}
            onChange={onFieldChange}
            onClearChange={onClearChange}
        />
    );

    return (
        <form onSubmit={onSubmit} noValidate>
            <Stack spacing={6}>
                {saveResult && (
                    <Alert severity={SAVE_RESULT_DISPLAY[saveResult].severity}>
                        {translate(SAVE_RESULT_DISPLAY[saveResult].message)}
                    </Alert>
                )}

                <Stack spacing={2}>
                    <Typography variant='h1'>{translate(`Group.${group.id}`)}</Typography>
                    <Typography variant='body1'>{translate(`Group.${group.id}.Description`)}</Typography>
                </Stack>

                {services.map(({ service, isEnabled, settings: serviceSettings }) => (
                    <Stack key={service} spacing={3} component='section' aria-labelledby={`pufferfin-service-${service}`}>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={2}
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                            justifyContent='space-between'
                        >
                            <Typography variant='h2' id={`pufferfin-service-${service}`}>
                                {translate(`Service.${service}`)}
                            </Typography>
                            <ServiceStatus service={service} isEnabled={isEnabled} />
                        </Stack>
                        {!isEnabled && (
                            <Typography variant='body2' color='text.secondary'>
                                {translate('ServiceStatus.DisabledHelp')}
                            </Typography>
                        )}
                        {serviceSettings.map(renderField)}
                    </Stack>
                ))}

                {generalSettings.length > 0 && (
                    <Stack spacing={3}>
                        {generalSettings.map(renderField)}
                    </Stack>
                )}

                <Button type='submit' size='large' disabled={isSubmitting}>
                    {translate('ButtonSave')}
                </Button>
            </Stack>
        </form>
    );
};

export default SettingsForm;
