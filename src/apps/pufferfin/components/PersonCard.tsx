import React, { useCallback } from 'react';

import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';

interface PersonCardProps<T> {
    name: string
    /** Character played, or job for crew. */
    role?: string | null
    imageUrl?: string
    /** Passed back to `onSelect`, so callers hand over a stable callback instead of a new closure per card. */
    value: T
    onSelect: (value: T) => void
}

const getInitials = (name: string) => name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('');

/** Round portrait with the name and role under it. */
const PersonCard = <T, >({ name, role, imageUrl, value, onSelect }: PersonCardProps<T>) => {
    const onClick = useCallback(() => onSelect(value), [ onSelect, value ]);

    return (
        <button
            type='button'
            className='pf-person'
            aria-label={role ? `${name}, ${role}` : name}
            onClick={onClick}
            {...{ [FOCUSABLE_ATTRIBUTE]: true }}
        >
            <span className='pf-person__portrait'>
                {imageUrl ? (
                    <img className='pf-person__image' src={imageUrl} alt='' loading='lazy' />
                ) : (
                    <span className='pf-person__initials' aria-hidden='true'>{getInitials(name)}</span>
                )}
            </span>
            <span className='pf-person__caption' aria-hidden='true'>
                <span className='pf-person__name'>{name}</span>
                {role && <span className='pf-person__role'>{role}</span>}
            </span>
        </button>
    );
};

export default PersonCard;
