import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderEpisodesPanel } from './episodesPanel';
import { createPanelHost } from './panelHost';
import { renderSettingsPanel } from './settingsPanel';

// The words are their keys here: the tests read what is said, not how
vi.mock('./strings', () => ({
    playerText: (key: string, ...args: Array<string | number>) => [ key, ...args ].join(' ')
}));

const MINUTE = 60 * 10_000_000;

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.className = '';
});

describe('createPanelHost', () => {
    it('opens one panel at a time and closes on Escape', () => {
        const root = document.createElement('div');
        document.body.append(root);
        const onOpenChange = vi.fn();
        const host = createPanelHost({ root, onOpenChange });
        const trigger = document.createElement('button');
        document.body.append(trigger);

        host.open('settings', trigger, 'Settings', panel => panel.append(document.createElement('button')));
        expect(host.isOpen('settings')).toBe(true);
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        expect(document.documentElement.classList.contains('pf-osd-panel-open')).toBe(true);

        host.open('tracks', null, 'Tracks', () => undefined);
        expect(host.isOpen('settings')).toBe(false);
        expect(host.isOpen('tracks')).toBe(true);
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(onOpenChange).toHaveBeenCalledTimes(1);

        const panel = root.querySelector<HTMLElement>('.pf-osd-panel')!;
        panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(host.isOpen()).toBe(false);
        expect(panel.hidden).toBe(true);
        expect(onOpenChange).toHaveBeenLastCalledWith(false);
    });

    it('closes on a press outside, but not on a button that toggles it', () => {
        const root = document.createElement('div');
        const outside = document.createElement('div');
        const toggle = document.createElement('button');
        toggle.setAttribute('data-pf-panel-toggle', '');
        document.body.append(root, outside, toggle);
        const host = createPanelHost({ root });

        host.open('episodes', toggle, 'Episodes', () => undefined);
        toggle.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        expect(host.isOpen()).toBe(true);

        outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        expect(host.isOpen()).toBe(false);
        expect(host.wasJustDismissed()).toBe(true);
    });
});

describe('renderSettingsPanel', () => {
    it('opens the speeds, picks one and comes back', () => {
        const panel = document.createElement('div');
        const select = vi.fn();
        renderSettingsPanel(panel, { locale: 'fr', speed: { current: 1, rates: [ 0.5, 1, 1.5 ], select } });

        const row = panel.querySelector<HTMLButtonElement>('.pf-osd-row')!;
        expect(row.textContent).toContain('1×');
        row.click();

        const options = panel.querySelectorAll<HTMLButtonElement>('.pf-osd-option');
        expect(Array.from(options).map(option => option.textContent)).toEqual([ '0,5×', 'Player.SpeedNormal 1×', '1,5×' ]);
        options[2].click();

        expect(select).toHaveBeenCalledWith(1.5);
        expect(panel.querySelector('.pf-osd-row')?.textContent).toContain('1,5×');
    });

    it('groups the rows and opens the subtitle look, a trait at a time', () => {
        const panel = document.createElement('div');
        const select = vi.fn();
        const subtitles = {
            choices: [ { key: 'textSize', label: 'Size', setting: { value: 'Medium', options: [
                { label: 'Medium', selected: true, onSelect: vi.fn() },
                { label: 'Large', onSelect: select }
            ] } } ],
            height: { value: 'L3', step: vi.fn(() => 'L4') },
            preview: vi.fn(),
            recenter: vi.fn(),
            reset: vi.fn()
        };
        renderSettingsPanel(panel, { quality: { value: 'Auto', options: [] }, subtitles });

        expect(Array.from(panel.querySelectorAll('.pf-osd-heading')).map(heading => heading.textContent))
            .toEqual([ 'Player.Settings', 'Player.GroupPlayback', 'Player.Subtitles' ]);
        panel.querySelectorAll<HTMLButtonElement>('.pf-osd-row')[1].click();
        expect(subtitles.preview).toHaveBeenCalled();

        const rows = () => panel.querySelectorAll<HTMLButtonElement>('.pf-osd-row');
        expect(rows()[0].textContent).toContain('Medium');
        rows()[0].click();
        panel.querySelectorAll<HTMLButtonElement>('.pf-osd-option')[1].click();
        expect(select).toHaveBeenCalled();
        // Back on the subtitle view, with the new value
        expect(rows()[0].textContent).toContain('Large');

        rows()[1].click();
        panel.querySelectorAll<HTMLButtonElement>('.pf-osd-row')[0].click();
        expect(subtitles.height.step).toHaveBeenCalledWith(-1);
        expect(panel.querySelector('.pf-osd-heading--value')?.textContent).toBe('L4');
    });

    it('turns a switch', () => {
        const panel = document.createElement('div');
        const set = vi.fn();
        renderSettingsPanel(panel, { autoSkipIntro: { checked: false, set } });

        const toggle = panel.querySelector<HTMLButtonElement>('[role="menuitemcheckbox"]')!;
        toggle.click();
        expect(set).toHaveBeenCalledWith(true);
        expect(toggle.getAttribute('aria-checked')).toBe('true');
    });
});

describe('renderEpisodesPanel', () => {
    it('lists the episodes of the season with what is watched and what plays', async () => {
        const panel = document.createElement('div');
        document.body.append(panel);
        const play = vi.fn();
        renderEpisodesPanel(panel, {
            currentId: 'e2',
            currentSeasonId: 's1',
            loadSeasons: () => Promise.resolve([ { Id: 's1', Name: 'Saison 1' }, { Id: 's2', Name: 'Saison 2' } ]),
            loadEpisodes: () => Promise.resolve([
                { Id: 'e1', Name: 'Pilote', IndexNumber: 1, RunTimeTicks: 42 * MINUTE, UserData: { Played: true } },
                { Id: 'e2', Name: 'Pris pour cible', IndexNumber: 2, RunTimeTicks: 42 * MINUTE },
                { Id: 'e3', Name: 'Chasse au trésor', IndexNumber: 3, RunTimeTicks: 42 * MINUTE }
            ]),
            imageUrl: () => undefined,
            positionTicks: () => 21 * MINUTE,
            play,
            close: vi.fn()
        });

        await flush();
        await flush();

        const rows = panel.querySelectorAll<HTMLButtonElement>('.pf-osd-episode');
        expect(rows).toHaveLength(3);
        expect(rows[0].classList.contains('pf-osd-episode--played')).toBe(true);
        expect(rows[1].getAttribute('aria-current')).toBe('true');
        expect(rows[1].textContent).toContain('Player.InProgress Player.MinutesLeft 21');
        expect(rows[2].textContent).toContain('Player.Minutes 42');
        expect(panel.querySelector('.pf-osd-chip')?.textContent).toBe('Saison 1');

        rows[2].click();
        expect(play).toHaveBeenCalledWith(expect.objectContaining({ Id: 'e3' }));
    });
});
