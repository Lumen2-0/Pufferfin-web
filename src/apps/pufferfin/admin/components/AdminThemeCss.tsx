import React, { type FC, useEffect } from 'react';

import themeManager from 'scripts/themeManager';

/** The theme of the admin dashboard, see themes/pufferfin. */
export const ADMIN_THEME_ID = 'pufferfin';

/**
 * Applies the Pufferfin theme to the admin dashboard, in place of the dashboard theme of the user settings,
 * so that entering the dashboard never changes universe. Like the upstream ThemeCss, it sets the color scheme
 * through the theme manager and loads the legacy stylesheet of the theme.
 */
const AdminThemeCss: FC = () => {
    useEffect(() => {
        void themeManager.setTheme(ADMIN_THEME_ID);
    }, []);

    return (
        <link
            rel='stylesheet'
            type='text/css'
            href={`themes/${ADMIN_THEME_ID}/theme.css`}
        />
    );
};

export default AdminThemeCss;
