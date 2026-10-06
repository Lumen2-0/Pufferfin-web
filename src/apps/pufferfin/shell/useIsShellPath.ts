import { useLocation } from 'react-router-dom';

import { isShellPath } from './paths';

/** Whether the current upstream page gets the Pufferfin bar in place of the upstream header. */
export function useIsShellPath() {
    const location = useLocation();
    return isShellPath(location.pathname);
}
