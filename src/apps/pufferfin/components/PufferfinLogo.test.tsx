import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PufferfinLogo from './PufferfinLogo';

// The upstream language module pulls the whole legacy app; the English source is enough here
vi.mock('lib/globalize', () => ({
    getLanguages: () => [ 'en-us' ],
    normalizeLocaleName: (locale: string) => locale
}));

// React warns outside of an act environment
Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

describe('Pufferfin: logo', () => {
    let container: HTMLDivElement;
    let root: Root;

    // The dictionaries load asynchronously: wait for that render too
    const render = (element: React.ReactElement) => act(async () => {
        root.render(element);
        await Promise.resolve();
    });
    const logo = () => container.firstElementChild as HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it('is an image named by the translated product name', async () => {
        await render(<PufferfinLogo />);

        expect(logo().getAttribute('role')).toBe('img');
        expect(logo().getAttribute('aria-label')).toBe('Pufferfin');
        expect(logo().getAttribute('aria-hidden')).toBeNull();
    });

    it('is hidden from assistive technologies next to a visible name', async () => {
        await render(<PufferfinLogo decorative />);

        expect(logo().getAttribute('role')).toBeNull();
        expect(logo().getAttribute('aria-label')).toBeNull();
        expect(logo().getAttribute('aria-hidden')).toBe('true');
    });

    it('takes the current text color, so `color` recolors it', async () => {
        await render(<PufferfinLogo style={{ fontSize: '2rem' }} />);

        expect(logo().style.backgroundColor).toBe('currentcolor');
        expect(logo().style.fontSize).toBe('2rem');
        expect(logo().style.width).toBe('1em');
    });
});
