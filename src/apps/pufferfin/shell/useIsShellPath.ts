import { useLocation } from 'react-router-dom';

import { useApi } from 'hooks/useApi';

import { isShellPath } from './paths';

/**
 * Whether the current upstream page gets the Pufferfin bar in place of the
 * upstream header. Without a signed in user (an unknown address served by the
 * public fallback route, for instance) there is nothing to navigate to.
 */
export function useIsShellPath() {
    const location = useLocation();
    const { user } = useApi();
    return !!user && isShellPath(location.pathname);
}
