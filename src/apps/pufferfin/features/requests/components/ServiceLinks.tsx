import React, { type FC } from 'react';

import { FOCUSABLE_ATTRIBUTE } from '../../../navigation/focus';
import { getStackLogo } from '../../stack/stackLogos';

const SERVICES = [
    { id: 'bazarr', url: 'https://bazarr.tv.qkimi.fr/', name: 'Bazarr' },
    { id: 'prowlarr', url: 'https://prowlarr.tv.qkimi.fr/', name: 'Prowlarr' },
    { id: 'qbittorrent', url: 'https://qbittorrent.tv.qkimi.fr/', name: 'qBittorrent' },
    { id: 'radarr', url: 'https://radarr.tv.qkimi.fr/', name: 'Radarr' },
    { id: 'sonarr', url: 'https://sonarr.tv.qkimi.fr/', name: 'Sonarr' }
];

/** Buttons to the web interface of each download service, for administrators. */
const ServiceLinks: FC = () => (
    <div className='pf-brands pf-downloads__services' role='group'>
        {SERVICES.map(service => (
            <a
                key={service.id}
                className='pf-brand'
                href={service.url}
                target='_blank'
                rel='noopener noreferrer'
                {...{ [FOCUSABLE_ATTRIBUTE]: true }}
            >
                <img className='pf-downloads__logo' src={getStackLogo(service.id)} alt='' draggable={false} />
                <span className='pf-brand__name'>{service.name}</span>
            </a>
        ))}
    </div>
);

export default ServiceLinks;
