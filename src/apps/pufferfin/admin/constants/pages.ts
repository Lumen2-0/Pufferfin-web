/** The admin pages that are not configuration pages, in menu order, relative to `/dashboard/pufferfin`. */
export enum AdminPageId {
    Requests = 'requests',
    Users = 'users',
    Storage = 'storage'
}

export const ADMIN_PAGES = [ AdminPageId.Requests, AdminPageId.Users, AdminPageId.Storage ];

export const getAdminPagePath = (id: AdminPageId) => `/dashboard/pufferfin/${id}`;
