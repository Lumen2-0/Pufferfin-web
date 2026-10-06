import { translate } from 'apps/pufferfin/i18n';
import type { RequestPermissions } from 'apps/pufferfin/api/types';

const QUOTA_REGEX = /^\d{1,6}$/;

/**
 * Reads the weekly quota typed by an administrator: `null` for no limit (an empty field), a whole number of 0 or
 * more, or `undefined` when the text is not one. The server rejects a negative quota again.
 */
export const parseQuota = (text: string): number | null | undefined => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    return QUOTA_REGEX.test(trimmed) ? parseInt(trimmed, 10) : undefined;
};

/** The rights of a user, as short translated sentences. */
export const describePermissions = (rights: RequestPermissions): string[] => {
    if (rights.IsAdministrator) return [ translate('PermissionAdministrator') ];

    const lines: string[] = [];
    if (!rights.CanRequest) {
        lines.push(translate('PermissionCannotRequest'));
    } else {
        lines.push(translate(rights.RequiresApproval ? 'PermissionRequiresApproval' : 'PermissionNoApproval'));
        lines.push(rights.WeeklyQuota == null ?
            translate('PermissionNoQuota', rights.UsedThisWeek) :
            translate('PermissionQuota', rights.UsedThisWeek, rights.WeeklyQuota));
    }
    lines.push(translate(rights.CanDelete ? 'PermissionCanDelete' : 'PermissionCannotDelete'));

    return lines;
};
