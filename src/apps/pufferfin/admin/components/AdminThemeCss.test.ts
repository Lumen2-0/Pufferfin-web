import { describe, expect, it } from 'vitest';

import config from 'config.json';
import appTheme from 'themes';

import { ADMIN_THEME_ID } from './AdminThemeCss';

/** Every color of a palette, with its path, including the computed variants, channels and component colors. */
const collectColors = (value: unknown, path: string, out: [string, string][]) => {
    if (typeof value === 'string') {
        out.push([ path, value ]);
    } else if (value && typeof value === 'object') {
        Object.entries(value).forEach(([ key, child ]) => {
            collectColors(child, `${path}.${key}`, out);
        });
    }
    return out;
};

/** Parses `#rgb`, `#rrggbb`, `rgb()`, `rgba()` and MUI channels (`r g b`) into RGB, or undefined. */
const toRgb = (color: string): [number, number, number] | undefined => {
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
    if (hex) {
        const digits = hex[1].length === 3 ? hex[1].split('').map(d => d + d).join('') : hex[1];
        return [ 0, 2, 4 ].map(i => parseInt(digits.slice(i, i + 2), 16)) as [number, number, number];
    }
    const numbers = /^(?:rgba?\()?\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(color);
    return numbers ? [ Number(numbers[1]), Number(numbers[2]), Number(numbers[3]) ] : undefined;
};

/** A color is blue when its hue sits between cyan and violet and it is saturated enough to read as a hue. */
const isBlue = ([ r, g, b ]: [number, number, number]) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === 0 || (max - min) / max < 0.15 || b !== max) return false;
    const delta = max - min;
    const hue = (60 * (((r - g) / delta) + 4) + 360) % 360;
    return hue >= 180 && hue <= 260;
};

describe('Pufferfin admin theme', () => {
    it('is a configured theme, so the theme manager can apply it', () => {
        expect(config.themes.some(theme => theme.id === ADMIN_THEME_ID)).toBe(true);
    });

    it('has no hue of blue anywhere in its palette', () => {
        const palette = appTheme.colorSchemes[ADMIN_THEME_ID]?.palette;
        expect(palette).toBeDefined();

        const colors = collectColors(palette, 'palette', []);
        const blues = colors.filter(([ , color ]) => {
            const rgb = toRgb(color);
            return rgb && isBlue(rgb);
        });

        expect(colors.length).toBeGreaterThan(50);
        expect(blues).toEqual([]);
    });

    it('has a black background and warm white actions', () => {
        const palette = appTheme.colorSchemes[ADMIN_THEME_ID]?.palette;

        expect(palette?.background.default).toBe('#000');
        expect(palette?.primary.main).toBe('#f5f2ec');
        expect(palette?.primary.mainChannel).toBe('245 242 236');
    });
});
