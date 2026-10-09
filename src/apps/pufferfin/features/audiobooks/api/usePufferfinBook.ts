import type { Api } from '@jellyfin/sdk';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { getPufferfin } from '../../../api/client';

/** One book of the library with its parts in reading order (see `PufferfinBooksController` on the server). */
export interface PufferfinBook {
    /** The folder of a book in parts, with its authors, length and progress, or the file of a book in one file. */
    Book: ItemDto
    /** The parts in reading order: one for a book in one file. */
    Parts: ItemDto[]
}

export const getPufferfinBook = (api: Api, itemId: string, signal?: AbortSignal) =>
    getPufferfin<PufferfinBook>(api, `/Pufferfin/Library/Books/${encodeURIComponent(itemId)}`, { signal });

export const pufferfinBookQueryKey = (itemId: string, userId: string | null | undefined) =>
    [ 'Pufferfin', 'Library', 'Book', itemId, userId ];

/** A book of the library and its parts, read again when the page comes back so the progress stays right. */
export const usePufferfinBook = (itemId: string) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: pufferfinBookQueryKey(itemId, user?.Id),
        queryFn: ({ signal }) => getPufferfinBook(api!, itemId, signal),
        enabled: !!api && !!user?.Id && !!itemId
    });
};
