import type { UserConfiguration } from '@jellyfin/sdk/lib/generated-client/models/user-configuration';
import type { UserDto } from '@jellyfin/sdk/lib/generated-client/models/user-dto';
import { getAuthenticationApi } from '@jellyfin/sdk/lib/utils/api/authentication-api';
import { getImageApi } from '@jellyfin/sdk/lib/utils/api/image-api';
import { getLocalizationApi } from '@jellyfin/sdk/lib/utils/api/localization-api';
import { getUserApi } from '@jellyfin/sdk/lib/utils/api/user-api';
import { useMutation, useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';

import { getPufferfin, postPufferfin } from '../../api/client';

const ME_KEY = [ 'Pufferfin', 'Settings', 'Me' ];
const PUFFERFIN_KEY = [ 'Pufferfin', 'Settings', 'Pufferfin' ];

/** The signed in user, read fresh for the settings window: its configuration changes from here. */
export const useMe = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ ...ME_KEY, user?.Id ],
        queryFn: async ({ signal }) => (await getUserApi(api!).getCurrentUser({ signal })).data,
        enabled: !!api && !!user?.Id
    });
};

/** Saves a change of the server side settings of the user (languages, subtitles, playback), the rest kept. */
export const useSaveConfiguration = () => {
    const { api } = useApi();
    return useMutation({
        mutationFn: async ({ me, change }: { me: UserDto, change: Partial<UserConfiguration> }) => {
            const userConfiguration = { ...me.Configuration, ...change };
            await getUserApi(api!).updateUserConfiguration({ userId: me.Id!, userConfiguration });
            return { ...me, Configuration: userConfiguration };
        },
        onSuccess: me => queryClient.setQueriesData({ queryKey: ME_KEY }, me)
    });
};

export const useChangePassword = () => {
    const { api } = useApi();
    return useMutation({
        mutationFn: ({ userId, current, next }: { userId: string, current: string, next: string }) =>
            getUserApi(api!).updateUserPassword({ userId, updateUserPassword: { CurrentPw: current, NewPw: next } })
    });
};

/** The largest picture a user can send for their avatar. */
export const MAX_AVATAR_BYTES = 10 * 1024 * 1024;

export const useChangeAvatar = () => {
    const { api } = useApi();
    return useMutation({
        mutationFn: async ({ userId, file }: { userId: string, file: File | null }) => {
            if (file) {
                await getImageApi(api!).postUserImage({ userId, body: file }, { headers: { 'Content-Type': file.type } });
            } else {
                await getImageApi(api!).deleteUserImage({ userId });
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ME_KEY })
    });
};

/** Avatar of a user, or none. */
export const getAvatarUrl = (api: ReturnType<typeof useApi>['api'], me: UserDto | undefined) =>
    api && me?.Id && me.PrimaryImageTag ?
        api.getUri(`/Users/${me.Id}/Images/Primary`, { tag: me.PrimaryImageTag, maxWidth: 240, quality: 90 }) :
        undefined;

/** The languages the server knows, for audio and subtitles. */
export const useCultures = () => {
    const { api } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Settings', 'Cultures' ],
        queryFn: async ({ signal }) => (await getLocalizationApi(api!).getCultures({ signal })).data,
        enabled: !!api,
        staleTime: Infinity
    });
};

/** The languages the interface is translated into. */
export const useInterfaceLanguages = () => {
    const { api } = useApi();
    return useQuery({
        queryKey: [ 'Pufferfin', 'Settings', 'InterfaceLanguages' ],
        queryFn: async ({ signal }) => (await getLocalizationApi(api!).getLocalizationOptions({ signal })).data,
        enabled: !!api,
        staleTime: Infinity
    });
};

/** The Pufferfin settings of the user: the audio languages of the downloads, the Letterboxd account. */
export interface PufferfinUserSettings {
    LetterboxdUsername?: string | null
    PreferredAudioLanguages?: string[] | null
}

export const usePufferfinUserSettings = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ ...PUFFERFIN_KEY, user?.Id ],
        queryFn: ({ signal }) => getPufferfin<PufferfinUserSettings>(api!, '/Pufferfin/UserSettings', { signal }),
        enabled: !!api && !!user?.Id
    });
};

export const useSavePufferfinUserSettings = () => {
    const { api } = useApi();
    return useMutation({
        mutationFn: (settings: PufferfinUserSettings) => postPufferfin<PufferfinUserSettings>(api!, '/Pufferfin/UserSettings', settings),
        onSuccess: saved => queryClient.setQueriesData({ queryKey: PUFFERFIN_KEY }, saved)
    });
};

export const useAuthorizeQuickConnect = () => {
    const { api } = useApi();
    return useMutation({
        mutationFn: ({ userId, code }: { userId: string, code: string }) =>
            getAuthenticationApi(api!).authorizeQuickConnect({ code: code.replace(/\s/g, ''), userId })
    });
};
