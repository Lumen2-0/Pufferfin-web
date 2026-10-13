/**
 * The volume of the video player, as the design draws it: the mute button,
 * then a short bar right beside it that sets the level. The bar is a real
 * slider: drag it, click it, or move it with the arrow keys once focused.
 */

export interface InlineVolumeOptions {
    /** The element the bar goes in, after the mute button. */
    container: HTMLElement
    /** Sets the volume, from 0 to 100. */
    setVolume: (volume: number) => void
    /** Unmutes when the bar is moved while muted. */
    setMuted: (muted: boolean) => void
    /** The name of the bar, in the language of the interface. */
    label: string
}

export interface InlineVolume {
    /** Shows the current state of the player. */
    update: (muted: boolean, volume: number) => void
    /** Shows the bar only when the player can set the volume. */
    setAvailable: (isAvailable: boolean) => void
    destroy: () => void
}

const KEYS_OF_THE_SLIDER = new Set([ 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown' ]);

/** The icon of a level: off when muted or at zero, low under half, full above. */
export function getVolumeIcon(muted: boolean, volume: number) {
    if (muted || volume <= 0) return 'volume_off';
    return volume < 50 ? 'volume_down' : 'volume_up';
}

export function createInlineVolume(options: InlineVolumeOptions): InlineVolume {
    const { container } = options;
    let muted = false;

    const range = document.createElement('input');
    range.type = 'range';
    range.className = 'pf-volume__range';
    range.min = '0';
    range.max = '100';
    range.step = '1';
    range.setAttribute('aria-label', options.label);
    container.appendChild(range);

    const render = (level: number) => {
        const shown = muted ? 0 : Math.round(level);
        range.value = String(shown);
        range.style.setProperty('--pf-volume-fill', `${shown}%`);
        range.setAttribute('aria-valuetext', `${shown} %`);
    };

    const onInput = () => {
        const level = Number(range.value);
        // Moving the bar is wanting sound
        if (muted && level > 0) {
            muted = false;
            options.setMuted(false);
        }
        options.setVolume(level);
        render(level);
    };

    // The keys of the bar move the volume, not the video
    const onKeyDown = (event: KeyboardEvent) => {
        if (KEYS_OF_THE_SLIDER.has(event.key)) event.stopPropagation();
    };

    range.addEventListener('input', onInput);
    range.addEventListener('keydown', onKeyDown);
    render(100);

    return {
        update: (isMuted, level) => {
            muted = isMuted;
            render(Math.max(0, Math.min(100, Number(level) || 0)));
        },
        setAvailable: isAvailable => {
            range.hidden = !isAvailable;
        },
        destroy: () => {
            range.removeEventListener('input', onInput);
            range.removeEventListener('keydown', onKeyDown);
            range.remove();
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
