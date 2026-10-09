import { describe, expect, it, vi } from 'vitest';

import { toApiKeyUrl } from './authCompat';

vi.mock('jellyfin-apiclient', () => ({ ApiClient: class {} }));

describe('toApiKeyUrl', () => {
    it('carries the token of the WebSocket as ApiKey', () => {
        expect(toApiKeyUrl('wss://host/socket?api_key=abc&deviceId=d')).toBe('wss://host/socket?ApiKey=abc&deviceId=d');
        expect(toApiKeyUrl('ws://host/embywebsocket?api_key=abc')).toBe('ws://host/embywebsocket?ApiKey=abc');
    });

    it('leaves any other URL as it is', () => {
        expect(toApiKeyUrl('wss://host/ws?api_key=abc')).toBe('wss://host/ws?api_key=abc');
        expect(toApiKeyUrl('wss://host/socket?ApiKey=abc')).toBe('wss://host/socket?ApiKey=abc');
    });
});
