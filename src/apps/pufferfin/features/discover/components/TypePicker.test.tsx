import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DiscoverType } from '../utils/discover';
import TypePicker from './TypePicker';

// The upstream key mapping and language module pull the whole legacy app; the key names are enough here
vi.mock('scripts/keyboardNavigation', () => ({ getKeyName: (event: KeyboardEvent) => event.key }));
vi.mock('lib/globalize', () => ({ default: { getCurrentLocale: () => 'en-us' } }));

// React warns outside of an act environment
Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

// jsdom has no layout: scrolling into view is a no op
Element.prototype.scrollIntoView = () => undefined;

describe('Pufferfin: Discover type picker', () => {
    let container: HTMLDivElement;
    let root: Root;
    const onChange = vi.fn();

    const render = (value: DiscoverType) => act(() => {
        root.render(<TypePicker value={value} onChange={onChange} />);
    });
    const button = () => container.querySelector<HTMLButtonElement>('[aria-haspopup="listbox"]')!;
    const options = () => Array.from(container.querySelectorAll<HTMLButtonElement>('[role="option"]'));
    const press = (key: string) => act(() => {
        document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    });

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        onChange.mockReset();
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it('names the type shown on the closed button', () => {
        render(DiscoverType.Movies);
        expect(button().getAttribute('aria-expanded')).toBe('false');
        expect(button().textContent).toContain('Movies');
        expect(options()).toHaveLength(0);
    });

    it('moves the focus to the chosen type when it opens', () => {
        render(DiscoverType.Series);
        act(() => button().click());
        expect(button().getAttribute('aria-expanded')).toBe('true');
        expect(document.activeElement?.textContent).toBe('Series');
        expect(document.activeElement?.getAttribute('aria-selected')).toBe('true');
    });

    it('keeps Up and Down inside the list and stops at its ends', () => {
        render(DiscoverType.All);
        act(() => button().click());
        press('ArrowUp');
        expect(document.activeElement).toBe(options()[0]);
        press('ArrowDown');
        expect(document.activeElement).toBe(options()[1]);
    });

    it('closes on Escape and gives the focus back to the button', () => {
        render(DiscoverType.All);
        act(() => button().click());
        press('Escape');
        expect(options()).toHaveLength(0);
        expect(document.activeElement).toBe(button());
        expect(onChange).not.toHaveBeenCalled();
    });

    it('picks a type, closes and gives the focus back to the button', () => {
        render(DiscoverType.All);
        act(() => button().click());
        const books = options().find(option => option.textContent === 'Books')!;
        act(() => books.click());
        expect(onChange).toHaveBeenCalledWith(DiscoverType.Books);
        expect(options()).toHaveLength(0);
        expect(document.activeElement).toBe(button());
    });
});
