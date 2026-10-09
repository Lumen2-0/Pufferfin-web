import classNames from 'classnames';
import React, { type FC, useCallback } from 'react';

import { useTranslation } from '../../../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../../../navigation/focus';
import { type Brand, useBrands } from '../../catalog/api/useCatalog';

interface BrandPickerProps {
    /** Key of the chosen brand, none for every title. */
    value?: string
    onChange: (brand: string | undefined) => void
}

/** Marvel is drawn here: its red block reads at any size, the TMDB logo does not. */
const STUDIO_BADGES: Record<string, { badge: string }> = {
    marvel: { badge: 'MARVEL' }
};

/** Studios shown with their real logo, in its colors, and their name next to it. */
const STUDIO_LOGOS: Record<string, string> = {
    dc: 'DC Studios',
    warner: 'Warner Bros.'
};

const BrandButton: FC<{ brand: Brand, isSelected: boolean, onToggle: (key: string) => void }> = ({ brand, isSelected, onToggle }) => {
    const t = useTranslation();
    const onClick = useCallback(() => onToggle(brand.Key), [ brand.Key, onToggle ]);
    const isService = brand.Kind === 'Service';
    const studio = STUDIO_BADGES[brand.Key];
    const studioLabel = STUDIO_LOGOS[brand.Key];
    return (
        <button
            type='button'
            className={classNames('pf-brand', `pf-brand--${brand.Kind.toLowerCase()}`, { 'pf-brand--selected': isSelected })}
            aria-pressed={isSelected}
            aria-label={t('DiscoverBrand', brand.Name)}
            title={brand.Name}
            onClick={onClick}
            {...{ [FOCUSABLE_ATTRIBUTE]: true }}
        >
            {/* A service: its app icon and its name. Marvel: its block. DC and Warner Bros.: their logo and name. A network: its wordmark */}
            {isService && (
                <>
                    <img className='pf-brand__icon' src={brand.LogoUrl} alt='' draggable={false} />
                    <span className='pf-brand__name'>{brand.Name}</span>
                </>
            )}
            {!isService && studio && (
                <span className={classNames('pf-brand__badge', `pf-brand__badge--${brand.Key}`)} aria-hidden='true'>{studio.badge}</span>
            )}
            {!isService && studioLabel && (
                <>
                    <img className='pf-brand__icon pf-brand__icon--logo' src={brand.LogoUrl} alt='' draggable={false} />
                    <span className='pf-brand__name'>{studioLabel}</span>
                </>
            )}
            {!isService && !studio && !studioLabel && (
                <span className='pf-brand__wordmark' style={{ '--pf-brand-logo': `url("${brand.LogoUrl}")` } as React.CSSProperties} />
            )}
        </button>
    );
};

/**
 * The brands under the featured card: streaming services, studios and a
 * network, as small capsules in a row that scrolls sideways. Choosing one
 * keeps its titles; choosing it again shows every title. The choice is told
 * by a filled capsule and `aria-pressed`.
 */
const BrandPicker: FC<BrandPickerProps> = ({ value, onChange }) => {
    const t = useTranslation();
    const { data: brands } = useBrands();
    const onToggle = useCallback((key: string) => onChange(key === value ? undefined : key), [ onChange, value ]);

    if (!brands?.length) return null;

    return (
        <div className='pf-brands' role='group' aria-label={t('DiscoverBrands')}>
            {brands.map(brand => (
                <BrandButton key={brand.Key} brand={brand} isSelected={brand.Key === value} onToggle={onToggle} />
            ))}
        </div>
    );
};

export default BrandPicker;
