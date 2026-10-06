import { type Direction, findNextIndex } from './spatial';

/** Attribute marking an element reachable with the arrow keys. */
export const FOCUSABLE_ATTRIBUTE = 'data-pf-focusable';
/** Attribute marking a group (a row) that remembers its last focused element. */
export const FOCUS_GROUP_ATTRIBUTE = 'data-pf-focus-group';

const FOCUSABLE_SELECTOR = `[${FOCUSABLE_ATTRIBUTE}]:not([disabled])`;

/** Last focused element of each group, so coming back to a row restores the position. */
const groupMemory = new WeakMap<Element, HTMLElement>();

const getGroup = (element: Element) => element.closest(`[${FOCUS_GROUP_ATTRIBUTE}]`);

const isVisible = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
};

export function getFocusables(container: Element): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter(isVisible);
}

export function rememberFocus(element: Element) {
    const group = getGroup(element);
    if (group && element instanceof HTMLElement) groupMemory.set(group, element);
}

export function focusElement(element: HTMLElement) {
    element.focus({ preventScroll: true });
    // Rows scroll horizontally on their own, the page scrolls vertically.
    // The context margin comes from the CSS scroll-margin of focusable items.
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/** Focuses the first focusable element of the container. Returns false if there is none. */
export function focusFirst(container: Element) {
    const first = getFocusables(container)[0];
    if (!first) return false;
    focusElement(first);
    return true;
}

/**
 * Moves the focus from the active element in the given direction.
 * If the focus is outside the container (lost to the body after a re-render),
 * it is brought back to the first focusable element instead.
 */
export function moveFocus(container: Element, direction: Direction) {
    const active = document.activeElement;
    const candidates = getFocusables(container);

    if (!active || !container.contains(active) || candidates.indexOf(active as HTMLElement) === -1) {
        if (candidates[0]) focusElement(candidates[0]);
        return;
    }

    const index = findNextIndex(
        active.getBoundingClientRect(),
        candidates.map(candidate => candidate.getBoundingClientRect()),
        direction
    );
    if (index === -1) return;

    let target = candidates[index];
    const targetGroup = getGroup(target);
    if (targetGroup && targetGroup !== getGroup(active)) {
        const remembered = groupMemory.get(targetGroup);
        if (remembered && targetGroup.contains(remembered) && isVisible(remembered)) {
            target = remembered;
        }
    }

    focusElement(target);
}
