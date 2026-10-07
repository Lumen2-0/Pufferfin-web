import { CollectionType } from '@jellyfin/sdk/lib/generated-client/models/collection-type';
import { describe, expect, it } from 'vitest';

import enUs from '../../../strings/en-us.json';
import { getLibraryTabs, LIBRARY_TAB_LABELS, LibraryTab, parseLibraryTab } from './tabs';

describe('Pufferfin: library tabs', () => {
    it('gives films their upstream tabs', () => {
        expect(getLibraryTabs(CollectionType.Movies)).toEqual([
            LibraryTab.All, LibraryTab.Suggestions, LibraryTab.Genres, LibraryTab.Collections
        ]);
    });

    it('gives series their upstream tabs, upcoming, networks and episodes included', () => {
        expect(getLibraryTabs(CollectionType.Tvshows)).toEqual([
            LibraryTab.All, LibraryTab.Suggestions, LibraryTab.Upcoming, LibraryTab.Genres, LibraryTab.Networks, LibraryTab.Episodes
        ]);
    });

    it('keeps collections and playlists to their grid', () => {
        expect(getLibraryTabs(CollectionType.Boxsets)).toEqual([ LibraryTab.All ]);
        expect(getLibraryTabs(CollectionType.Playlists)).toEqual([ LibraryTab.All ]);
    });

    it('starts every library on All', () => {
        for (const type of [ CollectionType.Movies, CollectionType.Tvshows, CollectionType.Music, undefined ]) {
            expect(getLibraryTabs(type)[0]).toBe(LibraryTab.All);
        }
    });

    it('reads the tab of the address and falls back to All for a tab the library lacks', () => {
        const tabs = getLibraryTabs(CollectionType.Movies);
        expect(parseLibraryTab('genres', tabs)).toBe(LibraryTab.Genres);
        expect(parseLibraryTab('networks', tabs)).toBe(LibraryTab.All);
        expect(parseLibraryTab(null, tabs)).toBe(LibraryTab.All);
    });

    it('labels every tab with a source string', () => {
        for (const tab of Object.values(LibraryTab)) {
            expect(enUs).toHaveProperty(LIBRARY_TAB_LABELS[tab]);
        }
    });
});
