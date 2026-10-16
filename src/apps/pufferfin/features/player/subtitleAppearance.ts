import subtitleAppearanceHelper from 'components/subtitlesettings/subtitleappearancehelper';
import { getSubtitleAppearanceSettings, setSubtitleAppearanceSettings } from 'scripts/settings/userSettings';

import type { StringKey } from '../../i18n/translate';
import type { ChoiceSetting, SubtitleSettings } from './osd/settingsPanel';
import { playerText } from './osd/strings';
import { SUBTITLE_MOVED_EVENT } from './subtitlePosition';

type Appearance = Record<string, string | number | undefined>;

interface Trait {
    field: string
    label: StringKey
    /** What an unset field means: the value of the list it stands for. */
    initial: string
    values: Array<[ value: string, name: StringKey ]>
    /** The change needs the subtitles on the picture to be built again. */
    reload?: boolean
}

// The values are the ones the Jellyfin appearance helper draws, so the settings page of the account reads the same choices
const TRAITS: Trait[] = [
    {
        field: 'textSize',
        label: 'Player.SubtitleSize',
        initial: 'medium',
        values: [
            [ 'smaller', 'Player.SubtitleSizeSmaller' ],
            [ 'small', 'Player.SubtitleSizeSmall' ],
            [ 'medium', 'Player.SubtitleSizeMedium' ],
            [ 'large', 'Player.SubtitleSizeLarge' ],
            [ 'larger', 'Player.SubtitleSizeLarger' ],
            [ 'extralarge', 'Player.SubtitleSizeExtraLarge' ]
        ]
    },
    {
        field: 'font',
        label: 'Player.SubtitleFont',
        initial: '',
        values: [
            [ '', 'Player.SubtitleFontDefault' ],
            [ 'print', 'Player.SubtitleFontPrint' ],
            [ 'console', 'Player.SubtitleFontConsole' ],
            [ 'typewriter', 'Player.SubtitleFontTypewriter' ],
            [ 'casual', 'Player.SubtitleFontCasual' ],
            [ 'smallcaps', 'Player.SubtitleFontSmallCaps' ]
        ]
    },
    {
        field: 'textColor',
        label: 'Player.SubtitleColor',
        initial: '#ffffff',
        values: [
            [ '#ffffff', 'Player.SubtitleColorWhite' ],
            [ '#ffeb3b', 'Player.SubtitleColorYellow' ],
            [ '#00e5ff', 'Player.SubtitleColorCyan' ],
            [ '#69f0ae', 'Player.SubtitleColorGreen' ],
            [ '#ff80ab', 'Player.SubtitleColorPink' ],
            [ '#bdbdbd', 'Player.SubtitleColorGrey' ]
        ]
    },
    {
        field: 'textBackground',
        label: 'Player.SubtitleBackground',
        initial: 'transparent',
        values: [
            [ 'transparent', 'Player.SubtitleBackgroundNone' ],
            [ 'rgba(0,0,0,0.5)', 'Player.SubtitleBackgroundHalf' ],
            [ 'rgba(0,0,0,0.8)', 'Player.SubtitleBackgroundDark' ],
            [ '#000000', 'Player.SubtitleBackgroundSolid' ]
        ]
    },
    {
        field: 'dropShadow',
        label: 'Player.SubtitleShadow',
        initial: 'dropshadow',
        values: [
            [ 'none', 'Player.SubtitleShadowNone' ],
            [ 'dropshadow', 'Player.SubtitleShadowDrop' ],
            [ 'uniform', 'Player.SubtitleShadowOutline' ],
            [ 'raised', 'Player.SubtitleShadowRaised' ],
            [ 'depressed', 'Player.SubtitleShadowDepressed' ]
        ]
    },
    {
        field: 'subtitleStyling',
        label: 'Player.SubtitleDrag',
        initial: 'Auto',
        reload: true,
        values: [
            [ 'Auto', 'Player.SubtitleDragOff' ],
            [ 'Custom', 'Player.SubtitleDragOn' ]
        ]
    },
    {
        field: 'textWeight',
        label: 'Player.SubtitleWeight',
        initial: 'normal',
        values: [
            [ 'normal', 'Player.SubtitleWeightNormal' ],
            [ 'bold', 'Player.SubtitleWeightBold' ]
        ]
    }
];

const DEFAULT_POSITION = -3;
// Bottom of the screen up: the subtitles sit that many lines above the edge
const MIN_POSITION = -16;
const MAX_POSITION = -1;

const clampPosition = (value: number) => Math.min(MAX_POSITION, Math.max(MIN_POSITION, Number.isNaN(value) ? DEFAULT_POSITION : value));

const read = () => getSubtitleAppearanceSettings() as Appearance;
const write = (values: Appearance) => setSubtitleAppearanceSettings({ ...read(), ...values }, undefined);

/**
 * The look of the subtitles for the settings panel: each trait saved on the
 * device as the account settings page does, and `refresh` told to redraw the
 * subtitles on the picture at once.
 */
export function getSubtitleSettings(refresh: () => void, offset?: () => void, reload?: () => void): SubtitleSettings {
    const settings = read();

    const choices = TRAITS.map(trait => {
        const current = String(settings[trait.field] || trait.initial);
        const known = trait.values.find(([ value ]) => value === current)?.[1];
        const setting: ChoiceSetting = {
            // A value the account settings page set that is not in the list shows as it is
            value: known ? playerText(known) : current,
            options: trait.values.map(([ value, name ]) => ({
                label: playerText(name),
                selected: value === current,
                onSelect: () => {
                    write({ [trait.field]: value });
                    if (trait.reload) reload?.();
                    refresh();
                }
            }))
        };
        return { key: trait.field, label: playerText(trait.label), setting };
    });

    let position = clampPosition(parseInt(String(settings.verticalPosition), 10));
    const levelText = () => playerText('Player.SubtitleLevel', -position);

    return {
        choices,
        height: {
            value: levelText(),
            step: direction => {
                position = clampPosition(position + direction);
                write({ verticalPosition: position });
                refresh();
                return levelText();
            }
        },
        preview: element => subtitleAppearanceHelper.applyStyles({ text: element, preview: true }, read()),
        offset,
        recenter: () => {
            write({ dragX: 0, dragY: 0 });
            window.dispatchEvent(new Event(SUBTITLE_MOVED_EVENT));
            refresh();
        },
        reset: () => {
            write({
                ...Object.fromEntries(TRAITS.map(trait => [ trait.field, trait.initial ])),
                verticalPosition: DEFAULT_POSITION,
                dragX: 0,
                dragY: 0
            });
            window.dispatchEvent(new Event(SUBTITLE_MOVED_EVENT));
            reload?.();
            refresh();
            return getSubtitleSettings(refresh, offset, reload);
        }
    };
}
