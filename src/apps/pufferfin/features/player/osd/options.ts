import { ICONS } from './icons';
import { el } from './panelHost';

/** A choice of a panel list: its name, whether it is the current one, what it does. */
export interface PanelOption {
    label: string
    /** A detail on the right, quieter: the quality of a stream, a codec. */
    aside?: string
    selected?: boolean
    onSelect: () => void
}

/** A list of choices, the current one filled and checked, as a group of radio items. */
export function renderOptionList(options: PanelOption[], label: string): HTMLElement {
    const list = el('div', 'pf-osd-options');
    list.setAttribute('role', 'group');
    list.setAttribute('aria-label', label);

    options.forEach(option => {
        const button = el('button', 'pf-osd-option');
        button.type = 'button';
        button.setAttribute('role', 'menuitemradio');
        button.setAttribute('aria-checked', String(!!option.selected));
        button.append(el('span', 'pf-osd-option__label', option.label));
        if (option.aside) button.append(el('span', 'pf-osd-option__aside', option.aside));
        if (option.selected) button.insertAdjacentHTML('beforeend', ICONS.check);
        button.addEventListener('click', option.onSelect);
        list.append(button);
    });

    return list;
}

/** The small capitals heading of a column or a panel. */
export function renderHeading(text: string, id?: string): HTMLElement {
    const heading = el('div', 'pf-osd-heading', text);
    if (id) heading.id = id;
    return heading;
}
