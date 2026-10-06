/** Shortest query worth sending: one letter matches nearly everything. */
export const MIN_QUERY_LENGTH = 2;

/** Trims and collapses inner whitespace, as typed or as dictated. */
export function normalizeQuery(query: string) {
    return query.replace(/\s+/g, ' ').trim();
}

export function isSearchable(query: string) {
    return normalizeQuery(query).length >= MIN_QUERY_LENGTH;
}
