import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { CollectionType } from '@jellyfin/sdk/lib/generated-client/models/collection-type';
import { describe, expect, it } from 'vitest';

import { getNextPageStart, getViewItemTypes, hasLatestRow, isAudiobookEntry } from './library';

const page = (startIndex: number, count: number, totalCount: number) => ({
    items: Array.from({ length: count }),
    startIndex,
    totalCount
});

describe('Pufferfin: library helpers', () => {
    it('lists what each kind of library holds', () => {
        expect(getViewItemTypes(CollectionType.Movies)).toEqual([ BaseItemKind.Movie ]);
        expect(getViewItemTypes(CollectionType.Tvshows)).toEqual([ BaseItemKind.Series ]);
        expect(getViewItemTypes(CollectionType.Music)).toEqual([ BaseItemKind.MusicAlbum ]);
        expect(getViewItemTypes(CollectionType.Books)).toEqual([ BaseItemKind.Book, BaseItemKind.AudioBook ]);
    });

    it('lists films, series and videos for a mixed library', () => {
        expect(getViewItemTypes(undefined)).toEqual(expect.arrayContaining([ BaseItemKind.Movie, BaseItemKind.Series, BaseItemKind.Video ]));
    });

    it('leaves live TV to its upstream page', () => {
        expect(getViewItemTypes(CollectionType.Livetv)).toBeNull();
    });

    it('gives a Recently added row to the libraries the upstream home gives one', () => {
        expect(hasLatestRow({ Id: 'a', CollectionType: CollectionType.Movies })).toBe(true);
        expect(hasLatestRow({ Id: 'a', CollectionType: CollectionType.Livetv })).toBe(false);
        expect(hasLatestRow({ Id: 'a', CollectionType: CollectionType.Boxsets })).toBe(false);
        expect(hasLatestRow({ Id: 'a', CollectionType: CollectionType.Playlists })).toBe(false);
        expect(hasLatestRow({ CollectionType: CollectionType.Movies })).toBe(false);
    });

    it('skips the libraries the user excluded from their home', () => {
        expect(hasLatestRow({ Id: 'a', CollectionType: CollectionType.Movies }, [ 'a' ])).toBe(false);
        expect(hasLatestRow({ Id: 'b', CollectionType: CollectionType.Movies }, [ 'a' ])).toBe(true);
    });

    it('asks for the next page until every title is loaded', () => {
        expect(getNextPageStart(page(0, 60, 150))).toBe(60);
        expect(getNextPageStart(page(120, 30, 150))).toBeUndefined();
        expect(getNextPageStart(page(0, 60, 60))).toBeUndefined();
    });

    it('stops on an empty page even if the total says otherwise', () => {
        expect(getNextPageStart(page(60, 0, 150))).toBeUndefined();
    });

    it('plays a book from the books of a library: a file, or the folder of a book in parts', () => {
        expect(isAudiobookEntry({ Type: BaseItemKind.AudioBook })).toBe(true);
        expect(isAudiobookEntry({ Type: BaseItemKind.Folder })).toBe(true);
        expect(isAudiobookEntry({ Type: BaseItemKind.Book })).toBe(false);
        expect(isAudiobookEntry({ Type: BaseItemKind.Movie })).toBe(false);
    });
});
