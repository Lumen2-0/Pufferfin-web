import React, { type CSSProperties, type FC } from 'react';

import { translate, usePufferfinStrings } from '../i18n';

import logo from '../assets/logo/pufferfin-logo-dark.svg';

interface PufferfinLogoProps {
    /** Next to a visible name (server name, product name): hidden from assistive technologies. */
    decorative?: boolean
    className?: string
    /** Size it with `fontSize`, the logo is 1em square. */
    style?: CSSProperties
}

// The file is used as a mask: the logo takes the current text color, and the eye and
// the smile are cut out, so the background shows through on any dark surface
const LOGO_MASK = `url(${logo}) center / contain no-repeat`;

/** The Pufferfin logo, drawn in the current text color: `color` recolors it. */
const PufferfinLogo: FC<PufferfinLogoProps> = ({ decorative, className, style }) => {
    usePufferfinStrings();

    return (
        <span
            className={className}
            role={decorative ? undefined : 'img'}
            aria-label={decorative ? undefined : translate('ProductName')}
            aria-hidden={decorative || undefined}
            style={{
                display: 'inline-block',
                flexShrink: 0,
                width: '1em',
                height: '1em',
                backgroundColor: 'currentColor',
                WebkitMask: LOGO_MASK,
                mask: LOGO_MASK,
                ...style
            }}
        />
    );
};

export default PufferfinLogo;
