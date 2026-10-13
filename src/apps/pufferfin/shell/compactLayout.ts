/**
 * Phones, and tablets held upright: the screens sit in a bar at the bottom,
 * nothing at the top. Tablets in landscape and larger screens keep the top bar.
 * Media query `em` are the browser default 16px: 768px wide, or 1024px upright.
 */
export const COMPACT_QUERY = '(max-width: 47.99em), (max-width: 64em) and (orientation: portrait)';

/** Class on the document element while the bottom bar stands for the top bar. */
export const COMPACT_CLASS = 'pf-compact';

/** A TV keeps the top bar whatever its size: the remote walks it, there is no finger. */
export const isCompactLayout = (matchesQuery: boolean, isTv: boolean) => matchesQuery && !isTv;
