import { DASHBOARD_APP_PATHS } from 'apps/dashboard/routes/routes';

/**
 * Class on the document element giving the upstream playback screens the
 * Pufferfin look: the video player and its overlays (subtitle offset, stats,
 * up next), the queue and the lyrics. Every playback gets it, whatever screen
 * started it: a Pufferfin screen, an upstream page, a resume, Live TV,
 * SyncPlay or a direct link. The screens keep their upstream logic.
 */
export const PLAYER_SKIN_CLASS = 'pf-player-skin';

/**
 * Class on the document element giving the shared upstream dialogs the
 * Pufferfin look: action sheets (audio, subtitles, quality, speed), confirm
 * and form dialogs, the SyncPlay and cast menus, toasts.
 */
export const DIALOG_SKIN_CLASS = 'pf-dialog-skin';

/** Whether a pathname belongs to the admin dashboard, which has its own desktop theme. */
export const isDashboardPathname = (pathname: string) =>
    Object.values(DASHBOARD_APP_PATHS).some(path => pathname === `/${path}` || pathname.startsWith(`/${path}/`));

/**
 * The playback and dialog skin classes for a page. The player skin is
 * unconditional; the dialog skin covers every page but the admin dashboard,
 * whose dialogs keep the dense desktop grammar of its own theme.
 */
export const getPlaybackSkinClasses = (pathname: string) =>
    isDashboardPathname(pathname) ? [ PLAYER_SKIN_CLASS ] : [ PLAYER_SKIN_CLASS, DIALOG_SKIN_CLASS ];
