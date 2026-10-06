import { useCapabilities } from '../../../api/useCapabilities';
import { useRequestPermissions } from './useRequests';

/**
 * Whether the current user may request through a download service: the
 * service is enabled and the account may request. A missing or failed answer
 * counts as no, so no button shows for a service that is not there. The
 * server checks it all again on every request.
 */
export const useCanRequest = (service: 'Radarr' | 'Sonarr' | 'Shelfmark') => {
    const capabilities = useCapabilities();
    const permissions = useRequestPermissions();
    return {
        canRequest: !!capabilities.data?.[service] && !!permissions.data?.CanRequest,
        isSettled: !capabilities.isPending && !permissions.isPending
    };
};
