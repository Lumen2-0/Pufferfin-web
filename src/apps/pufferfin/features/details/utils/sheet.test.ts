import type { MediaSourceInfo } from '@jellyfin/sdk/lib/generated-client/models/media-source-info';
import { describe, expect, it } from 'vitest';

import { formatClock, getEpisodeWindow, getLanguageCode, getRemainingMinutes, getVersionTags } from './sheet';

const labels = { stereo: 'Stereo', subtitles: (codes: string) => `Subtitles ${codes}` };
const MINUTE = 600_000_000;

describe('Pufferfin: sheet', () => {
    it('formats a position as a clock', () => {
        expect(formatClock(0)).toBe('0:00');
        expect(formatClock((31 * 60 + 12) * 10_000_000)).toBe('31:12');
        expect(formatClock((3600 + 2 * 60 + 3) * 10_000_000)).toBe('1:02:03');
    });

    it('counts the minutes left, at least one', () => {
        expect(getRemainingMinutes(102 * MINUTE, 31 * MINUTE)).toBe(71);
        expect(getRemainingMinutes(42 * MINUTE, 42 * MINUTE)).toBe(1);
        expect(getRemainingMinutes(undefined, 10)).toBeUndefined();
    });

    it('shows a window of episodes around the current one', () => {
        expect(getEpisodeWindow(5, 2)).toEqual({ start: 0, end: 5 });
        expect(getEpisodeWindow(22, 14)).toEqual({ start: 8, end: 16 });
        expect(getEpisodeWindow(22, 2)).toEqual({ start: 0, end: 8 });
        expect(getEpisodeWindow(22, 21)).toEqual({ start: 14, end: 22 });
        expect(getEpisodeWindow(22, -1)).toEqual({ start: 0, end: 8 });
    });

    it('reads stream languages', () => {
        expect(getLanguageCode('fre')).toBe('FR');
        expect(getLanguageCode('eng')).toBe('EN');
        expect(getLanguageCode('und')).toBeUndefined();
        expect(getLanguageCode(null)).toBeUndefined();
    });

    it('tags the versions of a film', () => {
        const sources: MediaSourceInfo[] = [ {
            MediaStreams: [
                { Type: 'Video', Width: 1920, Height: 800 },
                { Type: 'Audio', Language: 'fre', Channels: 6 },
                { Type: 'Audio', Language: 'eng', Channels: 6 },
                { Type: 'Subtitle', Language: 'eng' },
                { Type: 'Subtitle', Language: 'fre' },
                { Type: 'Subtitle', Language: 'fre' }
            ]
        } ];
        expect(getVersionTags(sources, labels)).toEqual([ '1080p', '5.1', 'VF', 'VOSTFR', 'Subtitles FR · EN' ]);
    });

    it('says nothing of what it does not know', () => {
        expect(getVersionTags(undefined, labels)).toEqual([]);
        expect(getVersionTags([ { MediaStreams: [ { Type: 'Video', Width: 640, Height: 360 }, { Type: 'Audio', Channels: 2 } ] } ], labels))
            .toEqual([ 'Stereo' ]);
        // An English film with English subtitles only is not VOSTFR
        expect(getVersionTags([ { MediaStreams: [ { Type: 'Audio', Language: 'eng', Channels: 8 }, { Type: 'Subtitle', Language: 'eng' } ] } ], labels))
            .toEqual([ '7.1', 'Subtitles EN' ]);
    });
});
