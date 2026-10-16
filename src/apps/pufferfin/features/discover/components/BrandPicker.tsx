import classNames from 'classnames';
import React, { type FC, useCallback, useState } from 'react';

import { useTranslation } from '../../../i18n/useTranslation';
import { FOCUSABLE_ATTRIBUTE } from '../../../navigation/focus';
import { type Brand, useBrands } from '../../catalog/api/useCatalog';
import adultSwimIntro from '../../../assets/brands/adultswim.mp4';
import appleIntro from '../../../assets/brands/apple.mp4';
import canalIntro from '../../../assets/brands/canal.mp4';
import dcIntro from '../../../assets/brands/dc.mp4';
import disneyIntro from '../../../assets/brands/disney.mp4';
import marvelIntro from '../../../assets/brands/marvel.mp4';
import netflixIntro from '../../../assets/brands/netflix.mp4';
import paramountIntro from '../../../assets/brands/paramount.mp4';
import primeIntro from '../../../assets/brands/prime.mp4';
import warnerIntro from '../../../assets/brands/warner.mp4';

interface BrandPickerProps {
    /** Key of the chosen brand, none for every title. */
    value?: string
    onChange: (brand: string | undefined) => void
}

/** Studios shown with their real logo, in its colors, and their name next to it. */
const STUDIO_LOGOS: Record<string, string> = {
    dc: 'DC Studios',
    warner: 'Warner Bros'
};

/** The intro a brand plays in its button while the pointer is over it: a short clip, without sound, in a loop. */
const BRAND_INTROS: Record<string, string> = {
    adultswim: adultSwimIntro,
    apple: appleIntro,
    netflix: netflixIntro,
    dc: dcIntro,
    marvel: marvelIntro,
    warner: warnerIntro,
    canal: canalIntro,
    paramount: paramountIntro,
    disney: disneyIntro,
    prime: primeIntro
};

/** Marvel is drawn here, its red block and its name: the TMDB logo does not read at this size. */
const MARVEL_KEY = 'marvel';

/** Adult Swim is drawn here too: its [as] mark and its name, as its wordmark alone says no more than the name. */
const ADULT_SWIM_KEY = 'adultswim';

/** Criterion is no longer offered, whatever an older server still lists. */
const HIDDEN_BRANDS = new Set([ 'criterion' ]);

const getLabel = (brand: Brand) => STUDIO_LOGOS[brand.Key] ?? brand.Name;

const BrandButton: FC<{ brand: Brand, isSelected: boolean, onToggle: (key: string) => void }> = ({ brand, isSelected, onToggle }) => {
    const t = useTranslation();
    const onClick = useCallback(() => onToggle(brand.Key), [ brand.Key, onToggle ]);
    const [ isHovered, setHovered ] = useState(false);
    const onEnter = useCallback(() => setHovered(true), []);
    const onLeave = useCallback(() => setHovered(false), []);
    const intro = BRAND_INTROS[brand.Key];
    const isService = brand.Kind === 'Service';
    const studioLabel = STUDIO_LOGOS[brand.Key];
    return (
        <button
            type='button'
            className={classNames('pf-brand', `pf-brand--${brand.Kind.toLowerCase()}`, { 'pf-brand--selected': isSelected, 'pf-brand--playing': !!intro && isHovered })}
            aria-pressed={isSelected}
            aria-label={t('DiscoverBrand', brand.Name)}
            onClick={onClick}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            {...{ [FOCUSABLE_ATTRIBUTE]: true }}
        >
            {intro && isHovered && (
                <video className='pf-brand__intro' src={intro} autoPlay muted loop playsInline aria-hidden='true' tabIndex={-1} />
            )}
            {/* A service: its app icon and its name. Marvel: its block. DC and Warner Bros.: their logo and name. A network: its wordmark */}
            {isService && (
                <>
                    <img className='pf-brand__icon' src={brand.LogoUrl} alt='' draggable={false} />
                    <span className='pf-brand__name'>{brand.Name}</span>
                </>
            )}
            {!isService && studioLabel && (
                <>
                    <img className='pf-brand__icon pf-brand__icon--logo' src={brand.LogoUrl} alt='' draggable={false} />
                    <span className='pf-brand__name'>{studioLabel}</span>
                </>
            )}
            {brand.Key === MARVEL_KEY && (
                <>
                    <span className='pf-brand__badge' aria-hidden='true'>MARVEL</span>
                    <span className='pf-brand__name pf-brand__name--small'>Studios</span>
                </>
            )}
            {brand.Key === ADULT_SWIM_KEY && (
                <>
                    <span className='pf-brand__badge pf-brand__badge--outline' aria-hidden='true'>[as]</span>
                    <span className='pf-brand__name'>{brand.Name}</span>
                </>
            )}
            {!isService && !studioLabel && brand.Key !== MARVEL_KEY && brand.Key !== ADULT_SWIM_KEY && (
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
            {brands.filter(brand => !HIDDEN_BRANDS.has(brand.Key)).sort((a, b) => getLabel(a).localeCompare(getLabel(b), undefined, { sensitivity: 'base' })).map(brand => (
                <BrandButton key={brand.Key} brand={brand} isSelected={brand.Key === value} onToggle={onToggle} />
            ))}
        </div>
    );
};

export default BrandPicker;
