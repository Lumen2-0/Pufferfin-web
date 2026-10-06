import type { Api } from '@jellyfin/sdk';
import type { AxiosRequestConfig } from 'axios';

// The Pufferfin endpoints are not in the generated Jellyfin SDK. They are called through the SDK axios instance,
// with the same base path and authorization header as the generated clients.

const withAuthorization = (api: Api, options?: AxiosRequestConfig): AxiosRequestConfig => ({
    ...options,
    headers: {
        ...options?.headers,
        Authorization: api.authorizationHeader
    }
});

export const getPufferfin = async <T>(api: Api, path: string, options?: AxiosRequestConfig) => {
    const response = await api.axiosInstance.get<T>(api.getUri(path), withAuthorization(api, options));
    return response.data;
};

export const postPufferfin = async <T>(api: Api, path: string, body?: unknown, options?: AxiosRequestConfig) => {
    const response = await api.axiosInstance.post<T>(api.getUri(path), body, withAuthorization(api, options));
    return response.data;
};

export const deletePufferfin = async <T>(api: Api, path: string, options?: AxiosRequestConfig) => {
    const response = await api.axiosInstance.delete<T>(api.getUri(path), withAuthorization(api, options));
    return response.data;
};
