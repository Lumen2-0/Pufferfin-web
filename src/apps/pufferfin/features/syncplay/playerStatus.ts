import { playerText } from '../player/osd/strings';

import { isLastingStatus, PASSING_STATUS_MS, type PlayerStatus, statusKey } from './model';

import './syncPlayPanel.scss';

export interface SyncPlayStatus {
    /** Shows a status, or hides it with null. */
    show: (status: PlayerStatus | null) => void
    destroy: () => void
}

/**
 * The status of the group over the picture, in words: a quiet pill at the
 * top while the group waits for someone, syncs or starts, in place of the
 * large pulsing icon of upstream. A pause or a restart is told, then goes.
 */
export function createSyncPlayStatus(root: HTMLElement): SyncPlayStatus {
    const pill = document.createElement('div');
    pill.className = 'pf-sp-status';
    pill.setAttribute('role', 'status');
    pill.setAttribute('aria-live', 'polite');
    pill.hidden = true;
    const dot = document.createElement('span');
    dot.className = 'pf-sp-status__dot';
    dot.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    pill.append(dot, text);
    root.append(pill);

    let timer: ReturnType<typeof setTimeout> | undefined;

    const show = (status: PlayerStatus | null) => {
        if (timer) clearTimeout(timer);
        timer = undefined;
        if (!status) {
            pill.hidden = true;
            return;
        }
        text.textContent = playerText(statusKey(status));
        pill.classList.toggle('pf-sp-status--busy', isLastingStatus(status));
        pill.hidden = false;
        if (!isLastingStatus(status)) {
            timer = setTimeout(() => {
                pill.hidden = true;
            }, PASSING_STATUS_MS);
        }
    };

    return {
        show,
        destroy: () => {
            if (timer) clearTimeout(timer);
            pill.remove();
        }
    };
}
