import { describe, expect, it } from 'vitest';

import { holdsUserData } from './userDataQueries';

describe('holdsUserData', () => {
    it('matches the items of the user and the Pufferfin lists showing progress', () => {
        expect(holdsUserData([ 'User', 'u1', 'Items', 'i1' ], 'u1')).toBe(true);
        expect(holdsUserData([ 'Pufferfin', 'Details', 'Episodes', 's1', 'se1', 'u1' ], 'u1')).toBe(true);
        expect(holdsUserData([ 'Pufferfin', 'Home', 'Resume', [], 'u1' ], 'u1')).toBe(true);
        expect(holdsUserData([ 'Pufferfin', 'Library', 'p1', [], 'all', 'u1' ], 'u1')).toBe(true);
    });

    it('leaves the rest alone', () => {
        expect(holdsUserData([ 'User', 'u2', 'Items', 'i1' ], 'u1')).toBe(false);
        expect(holdsUserData([ 'Pufferfin', 'Catalog', 'Trending' ], 'u1')).toBe(false);
        expect(holdsUserData([ 'SyncPlay', 'Groups' ], 'u1')).toBe(false);
    });
});
