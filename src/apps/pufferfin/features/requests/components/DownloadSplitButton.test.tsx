import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DownloadSplitButton from './DownloadSplitButton';

vi.mock('lib/globalize', () => ({ default: { getCurrentLocale: () => 'en-us' } }));

// React warns outside of an act environment
Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

describe('DownloadSplitButton', () => {
    let container: HTMLDivElement;
    let root: Root;
    const onDownload = vi.fn();
    const onDownloadTemporary = vi.fn();

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        act(() => root.render(<DownloadSplitButton label='Download' onDownload={onDownload} onDownloadTemporary={onDownloadTemporary} />));
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    const main = () => container.querySelector<HTMLButtonElement>('.pf-split__main')!;
    const toggle = () => container.querySelector<HTMLButtonElement>('.pf-split__toggle')!;
    const menu = () => container.querySelector('[role="menu"]');

    it('downloads to keep from the main part, without opening the menu', () => {
        act(() => main().click());

        expect(onDownload).toHaveBeenCalledTimes(1);
        expect(onDownloadTemporary).not.toHaveBeenCalled();
        expect(menu()).toBeNull();
    });

    it('opens the menu only from the chevron, and downloads for a while from its option', () => {
        act(() => toggle().click());

        expect(toggle().getAttribute('aria-expanded')).toBe('true');
        const option = container.querySelector<HTMLButtonElement>('[role="menuitem"]')!;
        expect(document.activeElement).toBe(option);

        act(() => option.click());

        expect(onDownloadTemporary).toHaveBeenCalledTimes(1);
        expect(onDownload).not.toHaveBeenCalled();
        expect(menu()).toBeNull();
        expect(document.activeElement).toBe(toggle());
    });

    it('closes on Escape and on a click outside', () => {
        act(() => toggle().click());
        act(() => {
            menu()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        });
        expect(menu()).toBeNull();

        act(() => toggle().click());
        act(() => {
            document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        });
        expect(menu()).toBeNull();
    });
});
