import { describe, expect, it } from 'vitest';

import { canDownloadFile, parseContentDownload } from './fileDownload';

const movie = { Id: 'a', MediaType: 'Video', LocationType: 'FileSystem', IsFolder: false };
const allowed = { EnableContentDownloading: true };

describe('parseContentDownload', () => {
    it('is off unless set to true', () => {
        expect(parseContentDownload(null)).toBe(false);
        expect(parseContentDownload('')).toBe(false);
        expect(parseContentDownload('false')).toBe(false);
        expect(parseContentDownload('true')).toBe(true);
    });
});

describe('canDownloadFile', () => {
    it('shows for a file on disk when the preference and the policy allow it', () => {
        expect(canDownloadFile(movie, allowed, true)).toBe(true);
        expect(canDownloadFile({ ...movie, MediaType: 'Audio' }, allowed, true)).toBe(true);
    });

    it('hides when the preference is off', () => {
        expect(canDownloadFile(movie, allowed, false)).toBe(false);
    });

    it('hides when the policy forbids downloading', () => {
        expect(canDownloadFile(movie, { EnableContentDownloading: false }, true)).toBe(false);
        expect(canDownloadFile(movie, undefined, true)).toBe(false);
    });

    it('follows the server when it says no', () => {
        expect(canDownloadFile({ ...movie, CanDownload: false }, allowed, true)).toBe(false);
    });

    it('hides for a folder, a series or something not on disk', () => {
        expect(canDownloadFile({ ...movie, IsFolder: true }, allowed, true)).toBe(false);
        expect(canDownloadFile({ Id: 's', IsFolder: true }, allowed, true)).toBe(false);
        expect(canDownloadFile({ ...movie, LocationType: 'Virtual' }, allowed, true)).toBe(false);
        expect(canDownloadFile(undefined, allowed, true)).toBe(false);
    });
});
