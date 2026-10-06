import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import React, { type ChangeEvent, type FC, type FormEvent, useCallback, useState } from 'react';

import type { RequestPermissions } from 'apps/pufferfin/api/types';
import { translate } from 'apps/pufferfin/i18n';

import { useUpdatePermissions } from '../api/usePermissions';
import { parseQuota } from '../utils/permissions';

interface PermissionsDialogProps {
    userId: string;
    userName: string;
    permissions: RequestPermissions;
    onClose: () => void;
}

/** Edits what a user may request and delete. The server validates the values again. */
const PermissionsDialog: FC<PermissionsDialogProps> = ({ userId, userName, permissions, onClose }) => {
    const [ canRequest, setCanRequest ] = useState(permissions.CanRequest);
    const [ requiresApproval, setRequiresApproval ] = useState(permissions.RequiresApproval);
    const [ quota, setQuota ] = useState(permissions.WeeklyQuota?.toString() ?? '');
    const [ canDelete, setCanDelete ] = useState(permissions.CanDelete);
    const updatePermissions = useUpdatePermissions();

    const parsedQuota = parseQuota(quota);
    const isQuotaInvalid = parsedQuota === undefined;

    const onCanRequestChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setCanRequest(e.target.checked), []);
    const onRequiresApprovalChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setRequiresApproval(e.target.checked), []);
    const onQuotaChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setQuota(e.target.value), []);
    const onCanDeleteChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setCanDelete(e.target.checked), []);

    const onSubmit = useCallback((e: FormEvent) => {
        e.preventDefault();
        if (parsedQuota === undefined) return;

        updatePermissions.mutate({
            userId,
            permissions: {
                CanRequest: canRequest,
                RequiresApproval: requiresApproval,
                WeeklyQuota: parsedQuota,
                CanDelete: canDelete
            }
        }, { onSuccess: onClose });
    }, [ canDelete, canRequest, onClose, parsedQuota, requiresApproval, updatePermissions, userId ]);

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth='sm' aria-labelledby='pufferfin-permissions-title'>
            <form onSubmit={onSubmit}>
                <DialogTitle id='pufferfin-permissions-title'>{translate('PermissionsDialogTitle', userName)}</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ pt: 1 }}>
                        <FormControlLabel
                            control={<Checkbox checked={canRequest} onChange={onCanRequestChange} />}
                            label={translate('PermissionCanRequestLabel')}
                        />
                        <FormControlLabel
                            control={<Checkbox checked={requiresApproval} onChange={onRequiresApprovalChange} disabled={!canRequest} />}
                            label={translate('PermissionRequiresApprovalLabel')}
                        />
                        <TextField
                            label={translate('PermissionWeeklyQuotaLabel')}
                            value={quota}
                            onChange={onQuotaChange}
                            disabled={!canRequest}
                            error={isQuotaInvalid}
                            helperText={translate(isQuotaInvalid ? 'ValidationQuota' : 'PermissionWeeklyQuotaHelp')}
                            slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off' } }}
                        />
                        <FormControl>
                            <FormControlLabel
                                control={<Checkbox checked={canDelete} onChange={onCanDeleteChange} />}
                                label={translate('PermissionCanDeleteLabel')}
                            />
                            <FormHelperText>{translate('PermissionCanDeleteHelp')}</FormHelperText>
                        </FormControl>
                        {updatePermissions.isError && <Alert severity='error'>{translate('PermissionsSaveError')}</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>{translate('ButtonCancel')}</Button>
                    <Button type='submit' variant='contained' disabled={isQuotaInvalid || updatePermissions.isPending}>
                        {translate('ButtonSave')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default PermissionsDialog;
