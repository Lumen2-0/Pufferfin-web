import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import React, { type ChangeEvent, type FC, useCallback } from 'react';

import { type PufferfinSetting, SettingKind } from 'apps/pufferfin/api/types';
import { type PufferfinStringKey, translate } from 'apps/pufferfin/i18n';
import { Lock } from '../../components/icons';

export interface SettingFieldProps {
    setting: PufferfinSetting;
    value: string | undefined;
    error?: string;
    /** For a secret: the stored value will be cleared on save. */
    isCleared?: boolean;
    disabled?: boolean;
    onChange: (key: string, value: string) => void;
    onClearChange?: (key: string, isCleared: boolean) => void;
}

const getLabel = (key: string) => translate(`Setting.${key}` as PufferfinStringKey);
const getHelp = (key: string) => translate(`Setting.${key}.Help` as PufferfinStringKey);

const getInputMode = (kind: SettingKind) => {
    switch (kind) {
        case SettingKind.Integer:
            return 'numeric';
        case SettingKind.Decimal:
            return 'decimal';
        case SettingKind.Url:
            return 'url';
        default:
            return 'text';
    }
};

/** Explains where the value comes from when the environment is involved. */
const getSourceHelp = (setting: PufferfinSetting): string | undefined => {
    if (setting.IsReadOnly) return translate('EnvironmentReadOnlyHelp', setting.Key);
    if (setting.EnvironmentIgnored) return translate('EnvironmentIgnoredHelp', setting.Key);
    return undefined;
};

const HelperText: FC<{ help: string, sourceHelp?: string, error?: string }> = ({ help, sourceHelp, error }) => (
    <>
        {error ?? help}
        {sourceHelp && (
            <>
                <br />
                {sourceHelp}
            </>
        )}
    </>
);

const LockAdornment = () => (
    <InputAdornment position='end' title={translate('EnvironmentReadOnly')}>
        <Lock fontSize='small' aria-label={translate('EnvironmentReadOnly')} />
    </InputAdornment>
);

const BooleanSettingField: FC<SettingFieldProps> = ({ setting, value, error, disabled, onChange }) => {
    const { Key: key } = setting;
    const label = getLabel(key);

    const onCheckedChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        onChange(key, String(e.target.checked));
    }, [ key, onChange ]);

    return (
        <FormControl error={!!error}>
            <FormControlLabel
                control={
                    <Checkbox
                        name={key}
                        checked={value === 'true'}
                        onChange={onCheckedChange}
                        disabled={disabled || setting.IsReadOnly}
                    />
                }
                label={
                    setting.IsReadOnly ? (
                        <Stack direction='row' spacing={1} alignItems='center' component='span'>
                            <span>{label}</span>
                            <Chip size='small' icon={<Lock />} label={translate('EnvironmentReadOnly')} />
                        </Stack>
                    ) : label
                }
            />
            <FormHelperText>
                <HelperText help={getHelp(key)} sourceHelp={getSourceHelp(setting)} error={error} />
            </FormHelperText>
        </FormControl>
    );
};

const SecretState: FC<{ setting: PufferfinSetting, isCleared: boolean, disabled?: boolean, onClearClick: () => void }> = ({
    setting,
    isCleared,
    disabled,
    onClearClick
}) => {
    const isSet = setting.IsSet && !isCleared;
    const canClear = setting.IsSet && !setting.IsReadOnly;

    return (
        <InputAdornment position='end'>
            <Stack direction='row' spacing={1} alignItems='center'>
                <Chip
                    size='small'
                    color={isSet ? 'success' : 'default'}
                    variant='outlined'
                    label={translate(isSet ? 'SecretSet' : 'SecretEmpty')}
                />
                {canClear && (
                    <Button size='small' variant='outlined' onClick={onClearClick} disabled={disabled}>
                        {translate(isCleared ? 'ButtonUndoClearSecret' : 'ButtonClearSecret')}
                    </Button>
                )}
                {setting.IsReadOnly && <Lock fontSize='small' aria-label={translate('EnvironmentReadOnly')} />}
            </Stack>
        </InputAdornment>
    );
};

/** A secret is write only: the field starts blank and only says whether a value is set. */
const SecretSettingField: FC<SettingFieldProps> = ({
    setting,
    value,
    error,
    isCleared = false,
    disabled,
    onChange,
    onClearChange
}) => {
    const { Key: key } = setting;

    const onTextChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        onChange(key, e.target.value);
    }, [ key, onChange ]);

    const onClearClick = useCallback(() => {
        onChange(key, '');
        onClearChange?.(key, !isCleared);
    }, [ isCleared, key, onChange, onClearChange ]);

    const isEditable = !setting.IsReadOnly && !isCleared;
    let placeholder: string | undefined;
    let help = getHelp(key);
    if (isCleared) {
        help = translate('SecretWillBeCleared');
    } else if (isEditable) {
        placeholder = translate(setting.IsSet ? 'SecretReplacePlaceholder' : 'SecretNewPlaceholder');
        help = `${help} ${translate('SecretWriteOnlyHelp')}`;
    }

    return (
        <TextField
            name={key}
            type='password'
            label={getLabel(key)}
            value={value ?? ''}
            onChange={onTextChange}
            placeholder={placeholder}
            disabled={disabled || !isEditable}
            error={!!error}
            helperText={
                <HelperText
                    help={help}
                    sourceHelp={getSourceHelp(setting)}
                    error={error}
                />
            }
            slotProps={{
                input: {
                    endAdornment: (
                        <SecretState setting={setting} isCleared={isCleared} disabled={disabled} onClearClick={onClearClick} />
                    )
                },
                // Keep browsers from autofilling a stored password into a secret field.
                htmlInput: { autoComplete: 'new-password', spellCheck: false },
                inputLabel: { shrink: true }
            }}
        />
    );
};

const TextSettingField: FC<SettingFieldProps> = ({ setting, value, error, disabled, onChange }) => {
    const { Key: key } = setting;

    const onTextChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        onChange(key, e.target.value);
    }, [ key, onChange ]);

    return (
        <TextField
            name={key}
            label={getLabel(key)}
            value={value ?? ''}
            onChange={onTextChange}
            disabled={disabled || setting.IsReadOnly}
            error={!!error}
            helperText={<HelperText help={getHelp(key)} sourceHelp={getSourceHelp(setting)} error={error} />}
            slotProps={{
                input: setting.IsReadOnly ? { endAdornment: <LockAdornment /> } : undefined,
                htmlInput: {
                    inputMode: getInputMode(setting.Type),
                    spellCheck: false,
                    autoComplete: 'off'
                }
            }}
        />
    );
};

/**
 * One configuration field. Follows the form grammar of the dashboard.
 * A secret is write only: its value is never displayed, only whether it is set.
 * A value provided by the environment is read only and says why.
 */
const SettingField: FC<SettingFieldProps> = props => {
    if (props.setting.Type === SettingKind.Boolean) return <BooleanSettingField {...props} />;
    if (props.setting.IsSecret) return <SecretSettingField {...props} />;
    return <TextSettingField {...props} />;
};

export default SettingField;
