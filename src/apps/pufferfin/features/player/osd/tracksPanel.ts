import { renderHeading, renderOptionList, type PanelOption } from './options';
import { el } from './panelHost';
import { playerText } from './strings';

/** A stream of the media, as the player lists it. */
export interface TrackInfo {
    Index: number
    DisplayTitle?: string | null
}

export interface TracksModel {
    audio: TrackInfo[]
    audioIndex: number | null | undefined
    subtitles: TrackInfo[]
    /** -1 or nothing: no subtitles. */
    subtitleIndex: number | null | undefined
    setAudio: (index: number) => void
    setSubtitles: (index: number) => void
}

/**
 * Audio and subtitles side by side, the current ones checked. The audio
 * column shows only when there is more than one track to choose from.
 */
export function renderTracksPanel(panel: HTMLElement, model: TracksModel) {
    const columns = el('div', 'pf-osd-tracks');

    if (model.audio.length > 1) {
        const column = el('div', 'pf-osd-tracks__column');
        const audio: PanelOption[] = model.audio.map(track => ({
            label: track.DisplayTitle || String(track.Index),
            selected: track.Index === model.audioIndex,
            onSelect: () => {
                if (track.Index !== model.audioIndex) model.setAudio(track.Index);
            }
        }));
        column.append(renderHeading(playerText('Player.Audio')), renderOptionList(audio, playerText('Player.Audio')));
        columns.append(column);
    }

    const current = model.subtitleIndex ?? -1;
    const subtitles: PanelOption[] = [
        { label: playerText('Player.SubtitlesOff'), selected: current === -1, onSelect: () => { if (current !== -1) model.setSubtitles(-1); } },
        ...model.subtitles.map(track => ({
            label: track.DisplayTitle || String(track.Index),
            selected: track.Index === current,
            onSelect: () => {
                if (track.Index !== current) model.setSubtitles(track.Index);
            }
        }))
    ];
    const column = el('div', 'pf-osd-tracks__column');
    column.append(renderHeading(playerText('Player.Subtitles')), renderOptionList(subtitles, playerText('Player.Subtitles')));
    columns.append(column);

    panel.classList.toggle('pf-osd-panel--single', columns.childElementCount === 1);
    panel.append(columns);
}
