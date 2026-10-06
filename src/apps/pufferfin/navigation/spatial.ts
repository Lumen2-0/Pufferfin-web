/**
 * Pure geometry for spatial (arrow key) navigation.
 * Kept free of DOM access so it can be unit tested.
 */

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Rect {
    left: number
    top: number
    width: number
    height: number
}

/** Tolerance in pixels for elements that touch or overlap slightly. */
const EDGE_TOLERANCE = 1;
/** Weight of the cross axis offset: staying aligned matters more than being close. */
const CROSS_AXIS_WEIGHT = 2;

const right = (r: Rect) => r.left + r.width;
const bottom = (r: Rect) => r.top + r.height;
const centerX = (r: Rect) => r.left + r.width / 2;
const centerY = (r: Rect) => r.top + r.height / 2;

/** Distance along the travel axis, or -1 if the candidate is not in that direction. */
function mainAxisGap(origin: Rect, candidate: Rect, direction: Direction) {
    switch (direction) {
        case 'up':
            return bottom(candidate) <= origin.top + EDGE_TOLERANCE ? origin.top - bottom(candidate) : -1;
        case 'down':
            return candidate.top >= bottom(origin) - EDGE_TOLERANCE ? candidate.top - bottom(origin) : -1;
        case 'left':
            return right(candidate) <= origin.left + EDGE_TOLERANCE ? origin.left - right(candidate) : -1;
        case 'right':
            return candidate.left >= right(origin) - EDGE_TOLERANCE ? candidate.left - right(origin) : -1;
    }
}

/** Gap on the cross axis: 0 when the two rects overlap on that axis. */
function crossAxisGap(origin: Rect, candidate: Rect, direction: Direction) {
    if (direction === 'up' || direction === 'down') {
        const overlaps = candidate.left < right(origin) && right(candidate) > origin.left;
        return overlaps ? 0 : Math.abs(centerX(candidate) - centerX(origin));
    }

    const overlaps = candidate.top < bottom(origin) && bottom(candidate) > origin.top;
    return overlaps ? 0 : Math.abs(centerY(candidate) - centerY(origin));
}

/** Tie breaker between aligned candidates: closest centers win. */
function centerDistance(origin: Rect, candidate: Rect, direction: Direction) {
    return direction === 'up' || direction === 'down' ?
        Math.abs(centerX(candidate) - centerX(origin)) :
        Math.abs(centerY(candidate) - centerY(origin));
}

/**
 * Returns the index of the best candidate in the given direction, or -1 if none.
 * Candidates with an empty rect (hidden elements) are ignored.
 */
export function findNextIndex(origin: Rect, candidates: Rect[], direction: Direction): number {
    let bestIndex = -1;
    let bestScore = Infinity;
    let bestTieBreak = Infinity;

    candidates.forEach((candidate, index) => {
        if (candidate.width <= 0 || candidate.height <= 0) return;

        const gap = mainAxisGap(origin, candidate, direction);
        if (gap < 0) return;

        const score = gap + crossAxisGap(origin, candidate, direction) * CROSS_AXIS_WEIGHT;
        const tieBreak = centerDistance(origin, candidate, direction);

        if (score < bestScore || (score === bestScore && tieBreak < bestTieBreak)) {
            bestIndex = index;
            bestScore = score;
            bestTieBreak = tieBreak;
        }
    });

    return bestIndex;
}

/** Maps a key name (as returned by the upstream keyboard helper) to a direction. */
export function getDirection(keyName: string): Direction | undefined {
    switch (keyName) {
        case 'ArrowUp':
            return 'up';
        case 'ArrowDown':
            return 'down';
        case 'ArrowLeft':
            return 'left';
        case 'ArrowRight':
            return 'right';
        default:
            return undefined;
    }
}
