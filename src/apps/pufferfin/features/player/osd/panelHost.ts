/**
 * The panels of the video player: audio and subtitles, settings, episodes.
 * One shows at a time, a solid sheet above the controls on the right, a sheet
 * from the bottom on a phone. A click outside, Escape or Back closes it; the
 * arrow keys move between its choices, so it works with a keyboard and a remote.
 */

export type PanelKind = 'tracks' | 'settings' | 'episodes' | 'syncplay';

export interface PanelHostOptions {
    /** The element the panels are placed in: the player page. */
    root: HTMLElement
    /** Told when a panel opens or the last one closes, to hold the controls while one is open. */
    onOpenChange?: (isOpen: boolean) => void
}

export interface PanelRender {
    /** Fills the panel; called again by `refresh`. */
    (panel: HTMLElement): void
}

export interface PanelHost {
    /** Opens a panel, or closes it when it is the one open. */
    toggle: (kind: PanelKind, trigger: HTMLElement | null, label: string, render: PanelRender) => void
    open: (kind: PanelKind, trigger: HTMLElement | null, label: string, render: PanelRender) => void
    close: (restoreFocus?: boolean) => void
    isOpen: (kind?: PanelKind) => boolean
    /** Renders the open panel again, after the player changed what it shows. */
    refresh: () => void
    /** Whether a click outside just closed a panel: that click does nothing else. */
    wasJustDismissed: () => boolean
    destroy: () => void
}

/** Attribute of the buttons that open a panel: pressing them never counts as a click outside. */
export const PANEL_TOGGLE_ATTRIBUTE = 'data-pf-panel-toggle';

/** Class on the document element while a panel is open. */
export const PANEL_OPEN_CLASS = 'pf-osd-panel-open';

const PANEL_CLASS = 'pf-osd-panel focuscontainer';
const DISMISS_WINDOW_MS = 400;
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
const CLOSE_KEYS = new Set([ 'Escape', 'Backspace', 'GoBack', 'BrowserBack' ]);
const DIRECTIONS: Record<string, [number, number]> = {
    ArrowUp: [ 0, -1 ],
    ArrowDown: [ 0, 1 ],
    ArrowLeft: [ -1, 0 ],
    ArrowRight: [ 1, 0 ]
};

function center(element: Element) {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * The control nearest to the focused one in a direction, the way a remote
 * moves: straight ahead first, then the closest.
 */
export function findNextFocus(candidates: HTMLElement[], from: HTMLElement | null, direction: [number, number]): HTMLElement | undefined {
    if (!candidates.length) return undefined;
    if (!from || !candidates.includes(from)) return candidates[0];

    const origin = center(from);
    let best: HTMLElement | undefined;
    let bestScore = Infinity;

    candidates.forEach(candidate => {
        if (candidate === from) return;
        const point = center(candidate);
        const dx = point.x - origin.x;
        const dy = point.y - origin.y;
        const along = dx * direction[0] + dy * direction[1];
        if (along <= 1) return;
        const across = Math.abs(dx * direction[1]) + Math.abs(dy * direction[0]);
        const score = along + across * 2;
        if (score < bestScore) {
            bestScore = score;
            best = candidate;
        }
    });

    return best;
}

export function createPanelHost(options: PanelHostOptions): PanelHost {
    const { root } = options;

    // On a phone, the picture dims behind the sheet
    const scrim = document.createElement('div');
    scrim.className = 'pf-osd-scrim';
    scrim.setAttribute('aria-hidden', 'true');

    const panel = document.createElement('div');
    panel.className = PANEL_CLASS;
    panel.setAttribute('role', 'dialog');
    panel.hidden = true;
    scrim.hidden = true;
    root.append(scrim, panel);

    let openKind: PanelKind | null = null;
    let trigger: HTMLElement | null = null;
    let render: PanelRender | null = null;
    let dismissedAt = 0;

    const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter(element => element.offsetParent !== null || element === document.activeElement);

    /** Focus goes to the chosen option, else the first control of the panel. */
    const focusInitial = () => {
        const target = panel.querySelector<HTMLElement>('[aria-checked="true"], [aria-current="true"], [aria-selected="true"]')
            ?? focusables()[0]
            ?? panel;
        target.focus({ preventScroll: false });
    };

    const onDocumentPointerDown = (event: PointerEvent) => {
        const target = event.target as Element | null;
        if (!openKind || !target) return;
        if (panel.contains(target) || target.closest(`[${PANEL_TOGGLE_ATTRIBUTE}]`)) return;
        dismissedAt = Date.now();
        close(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
        if (!openKind) return;

        if (CLOSE_KEYS.has(event.key)) {
            // Backspace in a text field stays a Backspace
            if (event.key === 'Backspace' && (event.target as HTMLElement).tagName === 'INPUT') return;
            event.preventDefault();
            event.stopPropagation();
            close(true);
            return;
        }

        const direction = DIRECTIONS[event.key];
        if (direction) {
            event.preventDefault();
            event.stopPropagation();
            const next = findNextFocus(focusables(), document.activeElement as HTMLElement | null, direction);
            next?.focus();
            return;
        }

        // Enter and Space press the focused choice; the player must not see them
        if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
    };

    function setOpen(isOpen: boolean) {
        panel.hidden = !isOpen;
        scrim.hidden = !isOpen;
        document.documentElement.classList.toggle(PANEL_OPEN_CLASS, isOpen);
        options.onOpenChange?.(isOpen);
    }

    function open(kind: PanelKind, opener: HTMLElement | null, label: string, panelRender: PanelRender) {
        const wasOpen = !!openKind;
        trigger?.setAttribute('aria-expanded', 'false');

        openKind = kind;
        trigger = opener;
        render = panelRender;
        panel.dataset.kind = kind;
        panel.setAttribute('aria-label', label);
        panel.className = PANEL_CLASS;
        // The SyncPlay panel hangs under its button at the top; phones keep their bottom sheet
        const anchor = kind === 'syncplay' && opener && window.innerWidth > 640 ? opener.getBoundingClientRect() : undefined;
        if (anchor) panel.style.right = `${Math.max(8, Math.round(window.innerWidth - anchor.right))}px`;
        else panel.style.removeProperty('right');
        setChildren(panel);
        panelRender(panel);

        trigger?.setAttribute('aria-expanded', 'true');
        if (!wasOpen) {
            document.addEventListener('pointerdown', onDocumentPointerDown, true);
            setOpen(true);
        }
        focusInitial();
    }

    function close(restoreFocus = true) {
        if (!openKind) return;
        const opener = trigger;
        openKind = null;
        render = null;
        trigger = null;
        opener?.setAttribute('aria-expanded', 'false');
        document.removeEventListener('pointerdown', onDocumentPointerDown, true);
        setChildren(panel);
        delete panel.dataset.kind;
        setOpen(false);
        if (restoreFocus && opener?.isConnected) opener.focus();
    }

    panel.addEventListener('keydown', onKeyDown);

    return {
        toggle: (kind, opener, label, panelRender) => {
            if (openKind === kind) close(true);
            else open(kind, opener, label, panelRender);
        },
        open,
        close,
        isOpen: kind => (kind ? openKind === kind : !!openKind),
        refresh: () => {
            if (!openKind || !render) return;
            const hadFocus = panel.contains(document.activeElement);
            panel.className = PANEL_CLASS;
            setChildren(panel);
            render(panel);
            if (hadFocus) focusInitial();
        },
        wasJustDismissed: () => Date.now() - dismissedAt < DISMISS_WINDOW_MS,
        destroy: () => {
            close(false);
            panel.removeEventListener('keydown', onKeyDown);
            panel.remove();
            scrim.remove();
        }
    };
}

/** Replaces the children of an element. */
export function setChildren(parent: Element, ...children: Node[]) {
    while (parent.firstChild) parent.removeChild(parent.firstChild);
    parent.append(...children);
}

/** Builds an element with a class, for the panels written without a framework. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
}
