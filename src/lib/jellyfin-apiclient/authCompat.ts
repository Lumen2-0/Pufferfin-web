import { ApiClient } from 'jellyfin-apiclient';

/**
 * PUFFERFIN: the server takes the access token of a URL as `ApiKey` only; the
 * legacy `api_key` is refused while legacy authorization is off, as it is by
 * default. The bundled jellyfin-apiclient still writes `api_key` in two URLs:
 * the WebSocket (live updates: playback state, the play queue, requests) and
 * the file download. Both are rewritten here, before the first connection.
 */
const LEGACY_TOKEN = /([?&])api_key=/;
const SOCKET_PATH = /\/(socket|embywebsocket)\?/;

export function toApiKeyUrl(url: string): string {
    return SOCKET_PATH.test(url) ? url.replace(LEGACY_TOKEN, '$1ApiKey=') : url;
}

const NativeWebSocket = window.WebSocket;

function PufferfinWebSocket(this: unknown, url: string | URL, protocols?: string | string[]) {
    return new NativeWebSocket(toApiKeyUrl(String(url)), protocols);
}

Object.assign(PufferfinWebSocket, {
    CONNECTING: NativeWebSocket.CONNECTING,
    OPEN: NativeWebSocket.OPEN,
    CLOSING: NativeWebSocket.CLOSING,
    CLOSED: NativeWebSocket.CLOSED
});
PufferfinWebSocket.prototype = NativeWebSocket.prototype;
window.WebSocket = PufferfinWebSocket as unknown as typeof WebSocket;

const prototype = ApiClient.prototype as unknown as {
    getUrl: (name: string, params?: Record<string, unknown>) => string
    accessToken: () => string
    getItemDownloadUrl: (itemId: string) => string
};

prototype.getItemDownloadUrl = function (this: typeof prototype, itemId: string) {
    if (!itemId) throw new Error('itemId cannot be empty');
    return this.getUrl(`Items/${itemId}/Download`, { ApiKey: this.accessToken() });
};
