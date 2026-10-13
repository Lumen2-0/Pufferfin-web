import { initials } from './model';

import './notice.scss';

const VISIBLE_MS = 3500;
const LEAVE_MS = 200;
const MAX_NOTICES = 3;

let container: HTMLDivElement | null = null;

function getContainer() {
    if (!container || !container.isConnected) {
        container = document.createElement('div');
        container.className = 'pf-sp-notices';
        container.setAttribute('role', 'status');
        container.setAttribute('aria-live', 'polite');
        document.body.append(container);
    }
    return container;
}

/**
 * A SyncPlay notice, in the style of the panels: someone joined or left, the
 * group started or ended. With a name, its initials lead the line.
 */
export function showSyncPlayNotice(text: string, name?: string) {
    const list = getContainer();
    const notice = document.createElement('div');
    notice.className = 'pf-sp-notice';
    if (name) {
        const face = document.createElement('span');
        face.className = 'pf-sp-notice__avatar';
        face.setAttribute('aria-hidden', 'true');
        face.textContent = initials(name);
        notice.append(face);
    } else {
        notice.classList.add('pf-sp-notice--plain');
    }
    const words = document.createElement('span');
    words.textContent = text;
    notice.append(words);
    list.append(notice);

    // A burst of joins keeps the last few only
    while (list.childElementCount > MAX_NOTICES) list.firstElementChild?.remove();

    setTimeout(() => {
        notice.classList.add('pf-sp-notice--leaving');
        setTimeout(() => notice.remove(), LEAVE_MS);
    }, VISIBLE_MS);
}
