import { getUserDataApi } from '@jellyfin/sdk/lib/utils/api/user-data-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import { getItemQuery } from 'hooks/useItem';
import type { ItemDto } from 'types/base/models/item-dto';

/**
 * Marks a title as watched, or not watched any more. The sheet shows the new
 * state at once; the item is read again once the server answers.
 */
export const useTogglePlayed = (item: ItemDto | undefined) => {
    const { api, user } = useApi();
    const queryClient = useQueryClient();
    const itemId = item?.Id ?? undefined;
    const isPlayed = !!item?.UserData?.Played;
    const { queryKey } = getItemQuery(api, itemId, user?.Id ?? undefined);

    const mutation = useMutation({
        mutationFn: async (played: boolean) => {
            const userData = getUserDataApi(api!);
            const params = { itemId: itemId!, userId: user!.Id! };
            await (played ? userData.markPlayedItem(params) : userData.markUnplayedItem(params));
        },
        onMutate: (played: boolean) => {
            queryClient.setQueryData<ItemDto>(queryKey, previous => (previous?.UserData ? {
                ...previous,
                UserData: {
                    ...previous.UserData,
                    Played: played,
                    PlaybackPositionTicks: played ? 0 : previous.UserData.PlaybackPositionTicks
                }
            } : previous));
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey })
    });

    const toggle = () => {
        if (!api || !user?.Id || !itemId || mutation.isPending) return;
        mutation.mutate(!isPlayed);
    };

    return { isPlayed, toggle };
};
