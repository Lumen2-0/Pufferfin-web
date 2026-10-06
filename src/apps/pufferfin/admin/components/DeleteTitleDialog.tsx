import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import React, { type ChangeEvent, type FC, useCallback, useState } from 'react';

import { DeletionMode, type DeletionOutcome, DeletionStatus, TorrentAction, type TorrentPlan } from 'apps/pufferfin/api/types';
import { translate } from 'apps/pufferfin/i18n';
import { useLocale } from 'hooks/useLocale';

import { useDeleteTitle, useDeletionPlan } from '../api/useDeletion';
import { getDeletionFailure } from '../utils/deletion';

export interface DeletableTitle {
    id: string;
    name: string;
}

interface DeleteTitleDialogProps {
    title: DeletableTitle;
    /** Whether the immediate mode is offered. The server only accepts it from an administrator. */
    canDeleteImmediately: boolean;
    onClose: () => void;
    onDeleted: (title: DeletableTitle, outcome: DeletionOutcome) => void;
}

const getFailureMessage = (error: unknown) => {
    const failure = getDeletionFailure(error);
    return failure ? translate(`DeletionError.${failure}`) : translate('DeletionError.Unknown');
};

const TorrentPlanLine: FC<{ torrent: TorrentPlan, dateTimeLocale: string }> = ({ torrent, dateTimeLocale }) => {
    let action;
    if (torrent.Action !== TorrentAction.KeepUntilMinimum) {
        action = translate(`TorrentAction.${torrent.Action}`);
    } else if (torrent.MinimumReachedAt) {
        action = translate('TorrentAction.KeepUntilMinimum', new Date(torrent.MinimumReachedAt).toLocaleString(dateTimeLocale));
    } else {
        action = translate('TorrentAction.KeepUntilMinimumUnknown');
    }

    return (
        <ListItem disableGutters>
            <ListItemText primary={torrent.Name} secondary={action} />
        </ListItem>
    );
};

/**
 * Deletes a title of the library. The safe mode is the default; the immediate mode shows what it costs and
 * needs an explicit confirmation before the delete button is enabled. The server checks both again.
 */
const DeleteTitleDialog: FC<DeleteTitleDialogProps> = ({ title, canDeleteImmediately, onClose, onDeleted }) => {
    const { dateTimeLocale } = useLocale();
    const [ mode, setMode ] = useState(DeletionMode.Safe);
    const [ isConfirmed, setIsConfirmed ] = useState(false);
    const { data: preview, error: previewError, isPending: isPreviewPending } = useDeletionPlan(title.id, mode);
    const deleteTitle = useDeleteTitle();

    const isImmediate = mode === DeletionMode.Immediate;
    const plan = preview?.Plan;
    const previewFailure = previewError ? getDeletionFailure(previewError) : undefined;

    const onModeChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setMode(e.target.value as DeletionMode);
        setIsConfirmed(false);
        deleteTitle.reset();
    }, [ deleteTitle ]);

    const onConfirmedChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setIsConfirmed(e.target.checked);
    }, []);

    const onDeleteClick = useCallback(() => {
        deleteTitle.mutate({ itemId: title.id, mode, confirm: isImmediate && isConfirmed }, {
            onSuccess: outcome => onDeleted(title, outcome)
        });
    }, [ deleteTitle, isConfirmed, isImmediate, mode, onDeleted, title ]);

    const canDelete = !!plan && !deleteTitle.isPending && (!isImmediate || isConfirmed);

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth='sm' aria-labelledby='pufferfin-delete-title'>
            <DialogTitle id='pufferfin-delete-title'>{translate('DeleteTitleDialogTitle', title.name)}</DialogTitle>
            <DialogContent>
                <Stack spacing={3}>
                    {canDeleteImmediately && (
                        <FormControl>
                            <FormLabel id='pufferfin-delete-mode'>{translate('DeleteModeLabel')}</FormLabel>
                            <RadioGroup aria-labelledby='pufferfin-delete-mode' value={mode} onChange={onModeChange}>
                                {Object.values(DeletionMode).map(value => (
                                    <FormControlLabel
                                        key={value}
                                        value={value}
                                        control={<Radio />}
                                        label={
                                            <>
                                                <Typography variant='body1' component='span'>
                                                    {translate(`DeleteMode.${value}`)}
                                                </Typography>
                                                <Typography variant='body2' color='text.secondary' component='span' display='block'>
                                                    {translate(`DeleteMode.${value}.Help`)}
                                                </Typography>
                                            </>
                                        }
                                        sx={{ alignItems: 'flex-start', mb: 1 }}
                                    />
                                ))}
                            </RadioGroup>
                        </FormControl>
                    )}
                    {!canDeleteImmediately && (
                        <Typography variant='body2'>{translate('DeleteMode.Safe.Help')}</Typography>
                    )}

                    {isPreviewPending && <LinearProgress aria-label={translate('DeletePlanLoading')} />}

                    {previewError && (
                        <Alert severity={previewFailure === DeletionStatus.NotFound ? 'info' : 'error'}>
                            {getFailureMessage(previewError)}
                        </Alert>
                    )}

                    {plan && (
                        <Stack spacing={1}>
                            <Typography variant='h3'>{translate('DeletePlanTitle')}</Typography>
                            {plan.Torrents.length === 0 ? (
                                <Typography variant='body2'>{translate('DeletePlanNoTorrent')}</Typography>
                            ) : (
                                <List dense disablePadding>
                                    {plan.Torrents.map(torrent => (
                                        <TorrentPlanLine key={torrent.Hash} torrent={torrent} dateTimeLocale={dateTimeLocale} />
                                    ))}
                                </List>
                            )}
                        </Stack>
                    )}

                    {plan && isImmediate && (
                        <Alert severity={plan.PrivateBeforeMinimum > 0 ? 'warning' : 'info'}>
                            <Stack spacing={1}>
                                <span>
                                    {plan.PrivateBeforeMinimum > 0 ?
                                        translate('DeleteImmediateWarning', plan.PrivateBeforeMinimum) :
                                        translate('DeleteImmediateWarningNone')}
                                </span>
                                <FormControlLabel
                                    control={<Checkbox checked={isConfirmed} onChange={onConfirmedChange} />}
                                    label={translate('DeleteImmediateConfirm')}
                                />
                            </Stack>
                        </Alert>
                    )}

                    {deleteTitle.isError && (
                        <Alert severity={getDeletionFailure(deleteTitle.error) === DeletionStatus.NotFound ? 'info' : 'error'}>
                            {getFailureMessage(deleteTitle.error)}
                        </Alert>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{translate('ButtonCancel')}</Button>
                <Button color='error' variant='contained' onClick={onDeleteClick} disabled={!canDelete}>
                    {translate(isImmediate ? 'ButtonDeleteImmediately' : 'ButtonDelete')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteTitleDialog;
