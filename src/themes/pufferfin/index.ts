import type { ColorSystemOptions } from '@mui/material/styles';

import { buildCustomColorScheme } from 'themes/utils';

const WARM_WHITE = {
    main: '#f5f2ec',
    light: '#fff',
    dark: '#d9d4cb',
    contrastText: '#000'
};

/**
 * The default MUI scheme merged in by buildCustomColorScheme comes already computed from its blue palette:
 * color channels and component colors (alerts, sliders, switches...). Drops them, except the component colors
 * given here, so that MUI computes them again from the colors of this scheme.
 */
const withoutInheritedComputedColors = (scheme: ColorSystemOptions, options: ColorSystemOptions): ColorSystemOptions => {
    const palette: Record<string, unknown> = { ...scheme.palette };
    const given: Record<string, unknown> = { ...options.palette };
    Object.entries(palette).forEach(([ key, value ]) => {
        if (key.endsWith('Channel')) {
            delete palette[key];
        } else if (/^[A-Z]/.test(key)) {
            if (key in given) {
                palette[key] = given[key];
            } else {
                delete palette[key];
            }
        } else if (value && typeof value === 'object') {
            palette[key] = Object.fromEntries(
                Object.entries(value).filter(([ name ]) => !name.endsWith('Channel'))
            );
        }
    });
    return { ...scheme, palette };
};

/**
 * PUFFERFIN: the color scheme of the admin dashboard.
 * Pure black and warm neutrals, with no hue of blue anywhere, not even for info states.
 * The values mirror the Pufferfin design tokens in apps/pufferfin/styles/_tokens.scss.
 */
const OPTIONS: ColorSystemOptions = {
    palette: {
        mode: 'dark',
        primary: WARM_WHITE,
        secondary: WARM_WHITE,
        info: {
            main: '#bdb6ab',
            light: '#d6d0c6',
            dark: '#9a9389',
            contrastText: '#000'
        },
        background: {
            default: '#000',
            paper: '#000'
        },
        text: {
            primary: '#f5f2ec',
            secondary: 'rgba(245, 242, 236, 0.68)'
        },
        action: {
            focus: 'rgba(245, 242, 236, 0.16)',
            hover: 'rgba(245, 242, 236, 0.08)',
            selected: 'rgba(245, 242, 236, 0.12)',
            selectedOpacity: 0.12
        },
        divider: 'rgba(245, 242, 236, 0.12)',
        Alert: {
            infoFilledBg: '#26231f',
            infoFilledColor: '#f5f2ec'
        },
        AppBar: {
            defaultBg: '#000'
        },
        Button: {
            inheritContainedBg: 'rgba(245, 242, 236, 0.08)',
            inheritContainedHoverBg: 'rgba(245, 242, 236, 0.16)'
        },
        FilledInput: {
            bg: 'rgba(245, 242, 236, 0.06)',
            hoverBg: 'rgba(245, 242, 236, 0.1)'
        },
        SnackbarContent: {
            bg: '#26231f',
            color: '#f5f2ec'
        }
    }
};

const theme = withoutInheritedComputedColors(buildCustomColorScheme(OPTIONS), OPTIONS);

export default theme;
