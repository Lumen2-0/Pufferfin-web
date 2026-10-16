import bazarr from '../../assets/services/bazarr.png';
import prowlarr from '../../assets/services/prowlarr.png';
import qbittorrent from '../../assets/services/qbittorrent.png';
import radarr from '../../assets/services/radarr.png';
import sonarr from '../../assets/services/sonarr.png';

const LOGOS: Record<string, string> = { bazarr, prowlarr, qbittorrent, radarr, sonarr };

/** The logo of a service of the stack by its name, when there is one. */
export const getStackLogo = (name: string): string | undefined => LOGOS[name.trim().toLowerCase()];

export const byName = (a: { Name: string }, b: { Name: string }) => a.Name.localeCompare(b.Name, undefined, { sensitivity: 'base' });
