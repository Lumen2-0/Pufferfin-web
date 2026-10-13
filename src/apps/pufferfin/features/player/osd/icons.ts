/**
 * The drawings of the player, as the design draws them: 24 units, round
 * strokes in the current color. Markup strings, for the upstream player that
 * builds its controls outside React.
 */

const stroke = (size: number, width: number, body: string) =>
    `<svg aria-hidden="true" focusable="false" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const fill = (size: number, body: string) =>
    `<svg aria-hidden="true" focusable="false" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">${body}</svg>`;

export const ICONS = {
    back: stroke(22, 1.75, '<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>'),
    list: stroke(20, 1.75, '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/>'),
    close: stroke(20, 1.75, '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>'),
    check: stroke(16, 2.5, '<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    checkSmall: stroke(14, 2.5, '<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    chevronDown: stroke(16, 2, '<path d="M6 9l6 6 6-6"/>'),
    chevronRight: stroke(16, 2, '<path d="M9 6l6 6-6 6"/>'),
    chevronLeft: stroke(18, 2, '<path d="M15 6l-6 6 6 6"/>'),
    play: fill(18, '<path d="M7 4.5v15l13-7.5z"/>'),
    skip: fill(18, '<path d="M5 5l10 7-10 7z"/><path d="M18 5h2v14h-2z"/>')
};
