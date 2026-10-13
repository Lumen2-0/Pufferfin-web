import type { GroupInfoDto } from '@jellyfin/sdk/lib/generated-client/models/group-info-dto';

import { ICONS } from '../player/osd/icons';
import { renderHeading } from '../player/osd/options';
import { el, setChildren } from '../player/osd/panelHost';
import { playerText } from '../player/osd/strings';

import { createGroup, followAgain, getSyncSettings, joinGroup, leaveGroup, listGroups, setSyncSetting, stopForMe } from './actions';
import { groupStateKey, initials, nudgeOffset } from './model';
import type { SyncPlaySnapshot } from './syncPlayStore';

import './syncPlayPanel.scss';

/** What the panel needs from the player and the account. */
export interface SyncPlayPanelContext {
    snapshot: () => SyncPlaySnapshot
    /** The name of the user, to tell them apart in the group. */
    userName: () => string | null | undefined
    /** Whether the user may create a group. */
    canCreate: () => boolean
    /** Draws the panel again, after something changed. */
    refresh: () => void
}

type View = 'main' | 'settings';

const OFFSET_STEP_MS = 20;

function avatar(name: string, extra = ''): HTMLElement {
    const element = el('span', `pf-sp-avatar ${extra}`.trim(), initials(name));
    element.setAttribute('aria-hidden', 'true');
    return element;
}

/** A group to join: faces, its name and people, Join on the right. */
function groupRow(group: GroupInfoDto, groupId: string, isBusy: boolean, onJoin: (groupId: string) => void): HTMLButtonElement {
    const people = group.Participants ?? [];
    const row = el('button', 'pf-osd-row pf-sp-group');
    row.type = 'button';
    row.disabled = isBusy;
    const faces = el('span', 'pf-sp-faces');
    faces.append(...people.slice(0, 3).map(person => avatar(person)));
    const text = el('span', 'pf-sp-group__text');
    text.append(el('span', 'pf-sp-group__name', group.GroupName ?? ''), el('span', 'pf-sp-group__people', people.join(', ')));
    row.append(faces, text, el('span', 'pf-sp-join', playerText('SyncPlayJoin')));
    row.addEventListener('click', () => onJoin(groupId));
    return row;
}

function stateChip(snapshot: SyncPlaySnapshot): HTMLElement | null {
    const key = groupStateKey(snapshot.state ?? snapshot.group?.State, snapshot.reason);
    if (!key) return null;
    const chip = el('span', 'pf-sp-chip', playerText(key));
    if (snapshot.state === 'Playing') chip.classList.add('pf-sp-chip--live');
    return chip;
}

function actionRow(label: string, onClick: () => void, options: { chevron?: boolean, danger?: boolean, value?: string } = {}): HTMLButtonElement {
    const row = el('button', 'pf-osd-row');
    row.type = 'button';
    row.append(el('span', 'pf-osd-row__label', label));
    if (options.danger) row.classList.add('pf-sp-row--leave');
    if (options.chevron || options.value) {
        const aside = el('span', 'pf-osd-row__value');
        if (options.value) aside.append(document.createTextNode(options.value));
        if (options.chevron) aside.insertAdjacentHTML('beforeend', ICONS.chevronRight);
        row.append(aside);
    }
    row.addEventListener('click', onClick);
    return row;
}

function switchRow(label: string, checked: boolean, onChange: (checked: boolean) => void): HTMLButtonElement {
    const row = el('button', 'pf-osd-row pf-osd-row--switch');
    row.type = 'button';
    row.setAttribute('role', 'menuitemcheckbox');
    row.setAttribute('aria-checked', String(checked));
    row.append(el('span', 'pf-osd-row__label', label), el('span', 'pf-osd-switch'));
    row.addEventListener('click', () => {
        const next = row.getAttribute('aria-checked') !== 'true';
        row.setAttribute('aria-checked', String(next));
        onChange(next);
    });
    return row;
}

/**
 * The SyncPlay panel of the player, in the style of the other panels.
 * Outside a group: the groups to join and a group to create. In a group: its
 * name and what it does, its people, the synchronisation, following or not,
 * and leaving. Its view stays the same when it is drawn again.
 */
export function createSyncPlayPanel(context: SyncPlayPanelContext) {
    let view: View = 'main';
    let groups: GroupInfoDto[] | undefined;
    let isLoadingGroups = false;
    let isBusy = false;
    let error: string | undefined;

    const run = (action: () => Promise<void> | void) => {
        if (isBusy) return;
        isBusy = true;
        error = undefined;
        Promise.resolve()
            .then(action)
            .catch((reason: unknown) => {
                console.error('[Pufferfin] SyncPlay action failed', reason);
                error = playerText('SyncPlayError');
            })
            .finally(() => {
                isBusy = false;
                groups = undefined;
                context.refresh();
            });
    };

    const loadGroups = () => {
        if (isLoadingGroups) return;
        isLoadingGroups = true;
        listGroups()
            .then(list => {
                groups = list;
            })
            .catch(() => {
                groups = [];
                error = playerText('SyncPlayError');
            })
            .finally(() => {
                isLoadingGroups = false;
                context.refresh();
            });
    };

    function renderOutside(list: HTMLElement) {
        list.append(renderHeading(playerText('SyncPlayTitle')));
        if (!groups) {
            loadGroups();
            list.append(el('p', 'pf-sp-note', playerText('SyncPlayLoadingGroups')));
        } else if (!groups.length) {
            list.append(el('p', 'pf-sp-note', playerText('SyncPlayNoGroups')));
        } else {
            const join = (groupId: string) => run(() => joinGroup(groupId));
            groups.forEach(group => {
                if (group.GroupId) list.append(groupRow(group, group.GroupId, isBusy, join));
            });
        }

        if (context.canCreate()) {
            const create = el('button', 'pf-sp-primary', playerText('SyncPlayCreateGroup'));
            create.type = 'button';
            create.disabled = isBusy;
            create.addEventListener('click', () => run(() => createGroup(playerText('SyncPlayDefaultName', context.userName() ?? ''))));
            list.append(create);
        }
    }

    function renderInside(list: HTMLElement, snapshot: SyncPlaySnapshot) {
        const group = snapshot.group!;
        const head = el('div', 'pf-sp-head');
        head.append(el('div', 'pf-sp-head__name', group.GroupName ?? playerText('SyncPlayTitle')));
        const chip = stateChip(snapshot);
        if (chip) head.append(chip);
        list.append(head);

        list.append(renderHeading(playerText('SyncPlayMembers')));
        const people = el('ul', 'pf-sp-people');
        (group.Participants ?? []).forEach(person => {
            const item = el('li', 'pf-sp-person');
            item.append(avatar(person), el('span', 'pf-sp-person__name', person));
            if (person === context.userName()) item.append(el('span', 'pf-sp-person__you', playerText('SyncPlayYou')));
            people.append(item);
        });
        list.append(people);

        if (!snapshot.isFollowing) list.append(el('p', 'pf-sp-note', playerText('SyncPlayNotFollowing')));

        list.append(el('div', 'pf-osd-separator'));
        list.append(actionRow(playerText('SyncPlaySyncSettings'), () => {
            view = 'settings';
            context.refresh();
        }, { chevron: true }));
        list.append(snapshot.isFollowing ?
            actionRow(playerText('SyncPlayStopForMe'), () => run(stopForMe)) :
            actionRow(playerText('SyncPlayFollowAgain'), () => run(followAgain)));
        list.append(actionRow(playerText('SyncPlayLeave'), () => run(leaveGroup), { danger: true }));
    }

    function renderSettings(list: HTMLElement) {
        const header = el('div', 'pf-osd-subheader');
        const back = el('button', 'pf-osd-iconbutton pf-osd-iconbutton--small');
        back.type = 'button';
        back.setAttribute('aria-label', playerText('SyncPlayBack'));
        back.innerHTML = ICONS.chevronLeft;
        back.addEventListener('click', () => {
            view = 'main';
            context.refresh();
        });
        header.append(back, el('div', 'pf-osd-subheader__title', playerText('SyncPlaySyncSettings')));
        list.append(header);

        const settings = getSyncSettings();
        list.append(
            switchRow(playerText('SyncPlaySyncCorrection'), settings.enableSyncCorrection, checked => setSyncSetting('enableSyncCorrection', checked)),
            switchRow(playerText('SyncPlaySpeedToSync'), settings.useSpeedToSync, checked => setSyncSetting('useSpeedToSync', checked)),
            switchRow(playerText('SyncPlaySkipToSync'), settings.useSkipToSync, checked => setSyncSetting('useSkipToSync', checked))
        );

        // The extra offset, in steps: for a screen or speakers that lag
        const offset = el('div', 'pf-sp-offset');
        const value = el('span', 'pf-sp-offset__value', playerText('SyncPlayMs', settings.extraTimeOffset));
        const stepper = (label: string, step: number, icon: string) => {
            const button = el('button', 'pf-osd-iconbutton pf-osd-iconbutton--small');
            button.type = 'button';
            button.setAttribute('aria-label', label);
            button.innerHTML = icon;
            button.addEventListener('click', () => {
                const next = nudgeOffset(getSyncSettings().extraTimeOffset, step);
                setSyncSetting('extraTimeOffset', next);
                value.textContent = playerText('SyncPlayMs', next);
            });
            return button;
        };
        const controls = el('span', 'pf-sp-offset__controls');
        controls.append(
            stepper(playerText('SyncPlayOffsetEarlier'), -OFFSET_STEP_MS, ICONS.chevronLeft),
            value,
            stepper(playerText('SyncPlayOffsetLater'), OFFSET_STEP_MS, ICONS.chevronRight)
        );
        offset.append(el('span', 'pf-osd-row__label', playerText('SyncPlayExtraOffset')), controls);
        list.append(offset);
    }

    /** Draws the panel: the call the panel host makes, and again on each refresh. */
    return (panel: HTMLElement) => {
        const snapshot = context.snapshot();
        const isInGroup = !!snapshot.group;
        if (!isInGroup && view === 'settings') view = 'main';

        const list = el('div', 'pf-osd-settings pf-sp');
        list.setAttribute('role', 'menu');

        if (view === 'settings' && isInGroup) renderSettings(list);
        else if (isInGroup) renderInside(list, snapshot);
        else renderOutside(list);

        if (error) list.append(el('p', 'pf-sp-note pf-sp-note--error', error));

        panel.classList.toggle('pf-osd-panel--sub', view === 'settings');
        setChildren(panel, list);
    };
}
