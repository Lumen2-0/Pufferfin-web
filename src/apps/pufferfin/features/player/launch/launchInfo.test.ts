import { describe, expect, it } from 'vitest';

import { getLaunchInfo } from './launchInfo';

const format = (season: number, episode: number) => `S${season}, É${episode}`;

describe('getLaunchInfo', () => {
    it('shows a film by its backdrop, its logo and its year', () => {
        const info = getLaunchInfo({
            Id: 'film',
            Type: 'Movie',
            Name: 'Aftersun',
            ProductionYear: 2022,
            BackdropImageTags: [ 'b1', 'b2' ],
            ImageTags: { Primary: 'p', Logo: 'l' }
        }, format);
        expect(info).toEqual({
            title: 'Aftersun',
            detail: '2022',
            backdrop: { itemId: 'film', type: 'Backdrop', tag: 'b1' },
            logo: { itemId: 'film', type: 'Logo', tag: 'l' }
        });
    });

    it('shows an episode by its still, the series logo, and its numbers with its name', () => {
        const info = getLaunchInfo({
            Id: 'ep',
            Type: 'Episode',
            Name: 'Pris pour cible',
            SeriesName: 'Bones',
            ParentIndexNumber: 1,
            IndexNumber: 15,
            ImageTags: { Primary: 'still' },
            ParentBackdropItemId: 'series',
            ParentBackdropImageTags: [ 'sb' ],
            ParentLogoItemId: 'series',
            ParentLogoImageTag: 'sl'
        }, format);
        expect(info.title).toBe('Bones');
        expect(info.detail).toBe('S1, É15 · Pris pour cible');
        expect(info.backdrop).toEqual({ itemId: 'ep', type: 'Primary', tag: 'still' });
        expect(info.logo).toEqual({ itemId: 'series', type: 'Logo', tag: 'sl' });
    });

    it('falls back to the series backdrop for an episode without a still', () => {
        const info = getLaunchInfo({
            Id: 'ep',
            Type: 'Episode',
            Name: 'Pilote',
            SeriesName: 'Bones',
            ParentBackdropItemId: 'series',
            ParentBackdropImageTags: [ 'sb' ]
        }, format);
        expect(info.backdrop).toEqual({ itemId: 'series', type: 'Backdrop', tag: 'sb' });
        expect(info.detail).toBe('Pilote');
        expect(info.logo).toBeUndefined();
    });

    it('keeps a title with no picture at all', () => {
        expect(getLaunchInfo({ Id: 'v', Type: 'Video', Name: 'Clip' }, format)).toEqual({
            title: 'Clip',
            detail: undefined,
            backdrop: undefined,
            logo: undefined
        });
    });
});
