/**
 * The volume of the video player: the volume button opens, above it, a small
 * horizontal panel in the manner of a shadcn/ui popover with a slider. Mute
 * on the left, the slider, the level on the right. Escape, a click outside or
 * the volume button again closes it.
 */

export interface VolumePanelOptions {
    /** The volume button, which opens and closes the panel. */
    button: HTMLElement
    /** The element the panel is placed in, around the button. */
    container: HTMLElement
    /** Sets the volume, from 0 to 100. */
    setVolume: (volume: number) => void
    /** Mutes or unmutes. */
    setMuted: (muted: boolean) => void
    /** Words of the panel, in the language of the interface. */
    labels: { volume: string, mute: string, unmute: string }
    /** Told when the panel opens or closes, to hold the controls while it is open. */
    onOpenChange?: (isOpen: boolean) => void
}

export interface VolumePanel {
    toggle: () => void
    close: () => void
    isOpen: () => boolean
    /** Shows the current state of the player. */
    update: (muted: boolean, volume: number) => void
    destroy: () => void
}

const OPEN_CLASS = 'pf-volume--open';
const KEYS_OF_THE_SLIDER = new Set([ 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', ' ' ]);

/** The icon of a level: off when muted or at zero, low under half, full above. */
export function getVolumeIcon(muted: boolean, volume: number) {
    if (muted || volume <= 0) return 'volume_off';
    return volume < 50 ? 'volume_down' : 'volume_up';
}

export function createVolumePanel(options: VolumePanelOptions): VolumePanel {
    const { button, container, labels } = options;
    let muted = false;
    let volume = 100;

    const panel = document.createElement('div');
    panel.className = 'pf-volume';
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', labels.volume);
    panel.innerHTML = `
        <button type="button" class="pf-volume__mute"><span class="material-icons volume_up" aria-hidden="true"></span></button>
        <input type="range" class="pf-volume__range" min="0" max="100" step="1" />
        <span class="pf-volume__value" aria-hidden="true"></span>`;
    container.appendChild(panel);

    const muteButton = panel.querySelector<HTMLButtonElement>('.pf-volume__mute')!;
    const muteIcon = muteButton.querySelector<HTMLElement>('.material-icons')!;
    const range = panel.querySelector<HTMLInputElement>('.pf-volume__range')!;
    const value = panel.querySelector<HTMLElement>('.pf-volume__value')!;
    range.setAttribute('aria-label', labels.volume);
    button.setAttribute('aria-expanded', 'false');

    const render = () => {
        const shown = muted ? 0 : Math.round(volume);
        range.value = String(shown);
        range.style.setProperty('--pf-volume-fill', `${shown}%`);
        value.textContent = String(shown);
        muteIcon.className = `material-icons ${getVolumeIcon(muted, volume)}`;
        const muteLabel = muted ? labels.unmute : labels.mute;
        muteButton.setAttribute('aria-label', muteLabel);
        muteButton.title = muteLabel;
    };

    const isOpen = () => container.classList.contains(OPEN_CLASS);

    const onDocumentPointerDown = (event: PointerEvent) => {
        if (!container.contains(event.target as Node)) close();
    };

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close();
            button.focus();
            return;
        }
        // The keys of the slider move the volume, not the video
        if (event.target === range && KEYS_OF_THE_SLIDER.has(event.key)) event.stopPropagation();
    };

    function open() {
        if (isOpen()) return;
        container.classList.add(OPEN_CLASS);
        button.setAttribute('aria-expanded', 'true');
        document.addEventListener('pointerdown', onDocumentPointerDown, true);
        options.onOpenChange?.(true);
    }

    function close() {
        if (!isOpen()) return;
        container.classList.remove(OPEN_CLASS);
        button.setAttribute('aria-expanded', 'false');
        document.removeEventListener('pointerdown', onDocumentPointerDown, true);
        options.onOpenChange?.(false);
    }

    const toggle = () => (isOpen() ? close() : open());

    const onInput = () => {
        volume = Number(range.value);
        // Moving the slider is wanting sound
        if (muted && volume > 0) {
            muted = false;
            options.setMuted(false);
        }
        options.setVolume(volume);
        render();
    };

    const onMute = () => {
        muted = !muted;
        options.setMuted(muted);
        render();
    };

    range.addEventListener('input', onInput);
    muteButton.addEventListener('click', onMute);
    panel.addEventListener('keydown', onKeyDown);
    render();

    return {
        toggle,
        close,
        isOpen,
        update: (isMuted, level) => {
            muted = isMuted;
            volume = Math.max(0, Math.min(100, Number(level) || 0));
            render();
        },
        destroy: () => {
            close();
            range.removeEventListener('input', onInput);
            muteButton.removeEventListener('click', onMute);
            panel.removeEventListener('keydown', onKeyDown);
            panel.remove();
        }
    };
}

/**
 * Hover hints of the player buttons, as shadcn/ui tooltips: the title of
 * each button becomes a small pill drawn by the style sheet, and the browser
 * tooltip goes away. The player changes some titles as it plays (Pause and
 * Play, Mute and Unmute): they follow.
 */
export function enableButtonHints(root: HTMLElement): () => void {
    const adopt = (element: Element) => {
        const title = element.getAttribute('title');
        if (!title) return;
        // The key in brackets stays out of the hint: "Pause (K)" says Pause
        const bracket = title.lastIndexOf(' (');
        element.setAttribute('data-pf-hint', bracket > 0 && title.endsWith(')') ? title.slice(0, bracket) : title);
        // A label the player did not give follows the title
        if (!element.hasAttribute('aria-label') || element.hasAttribute('data-pf-hint-label')) {
            element.setAttribute('aria-label', title);
            element.setAttribute('data-pf-hint-label', '');
        }
        element.removeAttribute('title');
    };
    const buttons = () => root.querySelectorAll('.osdControls .paper-icon-button-light[title]');
    buttons().forEach(adopt);
    const observer = new MutationObserver(records => {
        records.forEach(record => {
            if (record.type === 'attributes' && (record.target as Element).closest('.osdControls')) adopt(record.target as Element);
        });
    });
    observer.observe(root, { attributes: true, attributeFilter: [ 'title' ], subtree: true });
    return () => observer.disconnect();
}
