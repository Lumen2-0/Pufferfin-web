import React, { type FC } from 'react';

import { FOCUSABLE_ATTRIBUTE } from '../navigation/focus';

interface PersonCardProps {
    name: string
    /** Character played, or job for crew. */
    role?: string | null
    imageUrl?: string
    onSelect: () => void
}

const getInitials = (name: string) => name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('');

/** Round portrait with the name and role under it. */
const PersonCard: FC<PersonCardProps> = ({ name, role, imageUrl, onSelect }) => (
    <button
        type='button'
        className='pf-person'
        aria-label={role ? `${name}, ${role}` : name}
        onClick={onSelect}
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

export default PersonCard;
