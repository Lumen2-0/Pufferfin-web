import { describe, expect, it } from 'vitest';

import { findStartIndex, orderPlaylistItems } from './playlist';

describe('orderPlaylistItems', () => {
    it('gives each item the playlist id of its own entry, whatever the order of the server answer', () => {
        const queue = [
            { ItemId: 'b', PlaylistItemId: 'p1' },
            { ItemId: 'a', PlaylistItemId: 'p2' }
        ];
        const items = [ { Id: 'a', Name: 'A' }, { Id: 'b', Name: 'B' } ];

        const ordered = orderPlaylistItems(queue, items);

        expect(ordered.map(item => [ item.Id, item.PlaylistItemId ])).toEqual([ [ 'b', 'p1' ], [ 'a', 'p2' ] ]);
    });

    it('keeps the place of an item the server left out, so the playing index still points at the right title', () => {
        const queue = [
            { ItemId: 'gone', PlaylistItemId: 'p1' },
            { ItemId: 'film', PlaylistItemId: 'p2' }
        ];

        const ordered = orderPlaylistItems(queue, [ { Id: 'film', Name: 'Film' } ], 'server');

        expect(ordered).toHaveLength(2);
        expect(ordered[0]).toMatchObject({ Id: 'gone', ServerId: 'server', PlaylistItemId: 'p1' });
        expect(ordered[1]).toMatchObject({ Id: 'film', Name: 'Film', PlaylistItemId: 'p2' });
    });

    it('lists a title twice with two playlist ids, without sharing one object', () => {
        const queue = [
            { ItemId: 'a', PlaylistItemId: 'p1' },
            { ItemId: 'a', PlaylistItemId: 'p2' }
        ];
        const ordered = orderPlaylistItems(queue, [ { Id: 'a' } ]);

        expect(ordered.map(item => item.PlaylistItemId)).toEqual([ 'p1', 'p2' ]);
        expect(ordered[0]).not.toBe(ordered[1]);
    });

    it('never expands a single episode into the rest of its series', () => {
        const ordered = orderPlaylistItems([ { ItemId: 'e5', PlaylistItemId: 'p1' } ], [ { Id: 'e5' } ]);
        expect(ordered).toHaveLength(1);
    });
});

describe('findStartIndex', () => {
    it('keeps the requested position when it holds the chosen title', () => {
        expect(findStartIndex([ 'a', 'b', 'c' ], 'b', 1)).toBe(1);
    });

    it('moves to the chosen title when the queue moved it', () => {
        expect(findStartIndex([ 'a', 'b', 'c' ], 'c', 0)).toBe(2);
    });

    it('keeps the requested position for a chosen folder or series, which is not in the queue', () => {
        expect(findStartIndex([ 'e1', 'e2' ], 'series', 1)).toBe(1);
    });

    it('falls back to the start for a position out of the queue', () => {
        expect(findStartIndex([ 'a' ], undefined, 4)).toBe(0);
        expect(findStartIndex([ 'a', 'b' ], 'b', -1)).toBe(1);
    });
});
