import { MediaSegmentType } from '@jellyfin/sdk/lib/generated-client/models/media-segment-type';

import { UserSettings } from 'scripts/settings/userSettings';

import { MediaSegmentAction } from '../constants/mediaSegmentAction';

const PREFIX = 'segmentTypeAction';
// PUFFERFIN: every segment Intro Skipper detects offers its Skip button by default
const DEFAULT_ACTIONS: Partial<Record<MediaSegmentType, MediaSegmentAction>> = {
    [MediaSegmentType.Intro]: MediaSegmentAction.AskToSkip,
    [MediaSegmentType.Recap]: MediaSegmentAction.AskToSkip,
    [MediaSegmentType.Outro]: MediaSegmentAction.AskToSkip,
    [MediaSegmentType.Preview]: MediaSegmentAction.AskToSkip,
    [MediaSegmentType.Commercial]: MediaSegmentAction.AskToSkip
};

export const getId = (type: MediaSegmentType) => `${PREFIX}__${type}`;

export function getMediaSegmentAction(userSettings: UserSettings, type: MediaSegmentType): MediaSegmentAction {
    const action = userSettings.get(getId(type), false);
    const defaultAction = DEFAULT_ACTIONS[type] || MediaSegmentAction.None;

    return action ? action as MediaSegmentAction : defaultAction;
}
