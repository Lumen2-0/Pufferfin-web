import { ICONS } from './icons';
import { type EpisodeInfo, getEpisodeState } from './model';
import { renderOptionList } from './options';
import { el, setChildren } from './panelHost';
import { playerText } from './strings';

export interface SeasonInfo {
    Id?: string | null
    Name?: string | null
}

export interface EpisodeItem extends EpisodeInfo {
    Name?: string | null
    IndexNumber?: number | null
    ParentIndexNumber?: number | null
    SeasonId?: string | null
}

export interface EpisodesModel {
    /** The episode playing. */
    currentId: string
    currentSeasonId?: string | null
    loadSeasons: () => Promise<SeasonInfo[]>
    loadEpisodes: (seasonId: string) => Promise<EpisodeItem[]>
    imageUrl: (episode: EpisodeItem) => string | undefined
    /** The live position of the episode playing. */
    positionTicks: () => number
    play: (episode: EpisodeItem) => void
    close: () => void
}

function renderEpisodeRow(episode: EpisodeItem, model: EpisodesModel): HTMLElement {
    const state = getEpisodeState(episode, model.currentId, model.positionTicks());
    const row = el('button', `pf-osd-episode pf-osd-episode--${state.kind}`);
    row.type = 'button';
    if (state.kind === 'current') row.setAttribute('aria-current', 'true');

    const art = el('span', 'pf-osd-episode__art');
    const imageUrl = model.imageUrl(episode);
    if (imageUrl) {
        const image = el('img', 'pf-osd-episode__image');
        image.alt = '';
        image.loading = 'lazy';
        image.src = imageUrl;
        art.append(image);
    }
    if (state.progress > 0) {
        const bar = el('span', 'pf-osd-episode__progress');
        const fill = el('span', 'pf-osd-episode__progress-fill');
        fill.style.width = `${state.progress}%`;
        bar.append(fill);
        art.append(bar);
    }

    const text = el('span', 'pf-osd-episode__text');
    if (episode.IndexNumber != null) text.append(el('span', 'pf-osd-episode__number', playerText('Player.EpisodeNumber', episode.IndexNumber)));
    text.append(el('span', 'pf-osd-episode__title', episode.Name ?? ''));

    const status = el('span', 'pf-osd-episode__status');
    if (state.kind === 'played') {
        status.insertAdjacentHTML('beforeend', ICONS.checkSmall);
        status.append(document.createTextNode(playerText('Player.Watched')));
    } else if (state.kind === 'current' || state.kind === 'inProgress') {
        status.textContent = playerText('Player.InProgress', playerText('Player.MinutesLeft', state.minutesLeft));
    } else if (state.minutes) {
        status.textContent = playerText('Player.Minutes', state.minutes);
    }
    text.append(status);

    row.append(art, text);
    row.addEventListener('click', () => {
        if (state.kind === 'current') model.close();
        else model.play(episode);
    });
    return row;
}

/**
 * The episodes of the series beside the picture: the season to show in a
 * menu, each episode with its picture, its number, its name and where the
 * person is in it. The episode playing is lit and scrolled into view.
 */
export function renderEpisodesPanel(panel: HTMLElement, model: EpisodesModel) {
    let seasons: SeasonInfo[] = [];
    let seasonId = model.currentSeasonId ?? undefined;
    let isChoosingSeason = false;

    const header = el('div', 'pf-osd-drawer__header');
    const title = el('div', 'pf-osd-drawer__title', playerText('Player.Episodes'));
    const actions = el('div', 'pf-osd-drawer__actions');
    const seasonButton = el('button', 'pf-osd-chip');
    seasonButton.type = 'button';
    seasonButton.hidden = true;
    seasonButton.setAttribute('aria-haspopup', 'true');
    seasonButton.setAttribute('aria-expanded', 'false');
    const closeButton = el('button', 'pf-osd-iconbutton');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', playerText('Player.Close'));
    closeButton.innerHTML = ICONS.close;
    closeButton.addEventListener('click', model.close);
    actions.append(seasonButton, closeButton);
    header.append(title, actions);

    const body = el('div', 'pf-osd-drawer__body');
    panel.append(header, body);

    const showMessage = (text: string) => {
        setChildren(body, el('p', 'pf-osd-drawer__message', text));
    };

    // Rows shaped like the real ones: a still and three lines, spaced as the list
    const showSkeleton = () => {
        const list = el('div', 'pf-osd-episodes');
        list.setAttribute('aria-hidden', 'true');
        list.append(...Array.from({ length: 5 }, () => {
            const row = el('div', 'pf-osd-episode pf-osd-episode--skeleton');
            const text = el('div', 'pf-osd-episode__text pf-osd-bones');
            text.append(
                el('span', 'pf-osd-bone pf-osd-bone--number'),
                el('span', 'pf-osd-bone pf-osd-bone--title'),
                el('span', 'pf-osd-bone pf-osd-bone--status')
            );
            row.append(el('div', 'pf-osd-episode__art pf-osd-bone'), text);
            return row;
        }));
        setChildren(body, list);
    };

    const updateSeasonButton = () => {
        const season = seasons.find(candidate => candidate.Id === seasonId);
        seasonButton.hidden = !seasons.length;
        setChildren(seasonButton, document.createTextNode(season?.Name ?? playerText('Player.ChooseSeason')));
        seasonButton.insertAdjacentHTML('beforeend', ICONS.chevronDown);
        seasonButton.setAttribute('aria-expanded', String(isChoosingSeason));
    };

    const showEpisodes = async (id: string) => {
        seasonId = id;
        isChoosingSeason = false;
        updateSeasonButton();
        showSkeleton();
        try {
            const episodes = await model.loadEpisodes(id);
            if (!body.isConnected || seasonId !== id || isChoosingSeason) return;
            const list = el('div', 'pf-osd-episodes');
            list.append(...episodes.map(episode => renderEpisodeRow(episode, model)));
            const hadFocus = panel.contains(document.activeElement);
            setChildren(body, list);
            const current = list.querySelector<HTMLElement>('[aria-current="true"]');
            current?.scrollIntoView?.({ block: 'center' });
            if (hadFocus || document.activeElement === document.body) (current ?? list.querySelector<HTMLElement>('button'))?.focus({ preventScroll: true });
        } catch (err) {
            console.error('[Pufferfin] Failed to load the episodes', err);
            if (body.isConnected) showMessage(playerText('Player.EpisodesError'));
        }
    };

    const showSeasons = () => {
        isChoosingSeason = true;
        updateSeasonButton();
        setChildren(body, renderOptionList(seasons.map(season => ({
            label: season.Name ?? '',
            selected: season.Id === seasonId,
            onSelect: () => {
                if (season.Id) void showEpisodes(season.Id);
            }
        })), playerText('Player.ChooseSeason')));
        body.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    };

    seasonButton.addEventListener('click', () => {
        if (isChoosingSeason && seasonId) void showEpisodes(seasonId);
        else showSeasons();
    });

    showSkeleton();
    model.loadSeasons()
        .then(result => {
            if (!body.isConnected) return;
            seasons = result.filter(season => !!season.Id);
            if (!seasonId || !seasons.some(season => season.Id === seasonId)) seasonId = seasons[0]?.Id ?? undefined;
            updateSeasonButton();
            if (seasonId) void showEpisodes(seasonId);
            else showMessage(playerText('Player.EpisodesError'));
        })
        .catch((err: unknown) => {
            console.error('[Pufferfin] Failed to load the seasons', err);
            if (body.isConnected) showMessage(playerText('Player.EpisodesError'));
        });
}
