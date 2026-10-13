/** Where a sideways row can still go. */
export interface RailState {
    canPrevious: boolean
    canNext: boolean
}

interface RailMetrics {
    scrollLeft: number
    scrollWidth: number
    clientWidth: number
}

/** Under this many pixels from an end, the row counts as at that end: rounding never leaves a useless arrow. */
const EDGE_TOLERANCE = 2;
/** Share of the visible width one arrow press moves: the last card seen stays in sight. */
const STEP_RATIO = 0.85;

/**
 * The arrows a row needs. A right-to-left row reports a negative scrollLeft,
 * so only its distance from the start counts.
 */
export function getRailState({ scrollLeft, scrollWidth, clientWidth }: RailMetrics): RailState {
    const travelled = Math.abs(scrollLeft);
    return {
        canPrevious: travelled > EDGE_TOLERANCE,
        canNext: travelled + clientWidth < scrollWidth - EDGE_TOLERANCE
    };
}

/** The horizontal distance of one press, signed for the reading direction of the row. */
export function getRailStep(clientWidth: number, direction: 1 | -1, isRtl: boolean) {
    const distance = Math.round(clientWidth * STEP_RATIO) * direction;
    return isRtl ? -distance : distance;
}
