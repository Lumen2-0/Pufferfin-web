import ErrorOutline from '@mui/icons-material/ErrorOutline';
import React, { type FC, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';

import { appHost } from 'components/apphost';
import { appRouter } from 'components/router/appRouter';
import { AppFeature } from 'constants/appFeature';
import { useUserViews } from 'hooks/api/useUserViews';
import { useApi } from 'hooks/useApi';
import { useQuickConnectEnabled } from 'hooks/useQuickConnect';
import { useWebConfig } from 'hooks/useWebConfig';
import shell from 'scripts/shell';
import Dashboard from 'utils/dashboard';

import RoundButton from '../components/RoundButton';
import {
    getAccountEntries,
    getAdminEntries,
    type MenuActionId,
    type MenuEntry
} from '../features/menu/utils/menu';
import { useTranslation } from '../i18n/useTranslation';
import { FOCUS_GROUP_ATTRIBUTE, FOCUSABLE_ATTRIBUTE } from '../navigation/focus';
import { useInitialFocus } from '../navigation/useInitialFocus';

const MENU_ACTIONS: Record<MenuActionId, () => void> = {
    downloadManager: () => shell.openDownloadManager(),
    clientSettings: () => shell.openClientSettings(),
    selectServer: () => Dashboard.selectServer(),
    signOut: () => Dashboard.logout(),
    exitApp: () => appHost.exit()
};

const runAction = (id: MenuActionId) => MENU_ACTIONS[id]();

const LINK_CLASS_NAME = 'pf-button pf-button--quiet pf-menu__link';

const MenuEntries: FC<{ entries: MenuEntry[] }> = ({ entries }) => {
    const t = useTranslation();

    return (
        <ul className='pf-menu__list'>
            {entries.map(entry => (
                <li key={entry.id} className='pf-menu__item'>
                    {entry.kind === 'link' ? (
                        <Link to={entry.path} className={LINK_CLASS_NAME} {...{ [FOCUSABLE_ATTRIBUTE]: true }}>
                            <span className='pf-button__label'>{t(entry.labelKey)}</span>
                        </Link>
                    ) : (
                        <RoundButton label={t(entry.labelKey)} value={entry.id} onClick={runAction} />
                    )}
                </li>
            ))}
        </ul>
    );
};

/**
 * Everything the upstream header offered: the account, the Jellyfin
 * libraries Pufferfin does not show (music, books, live TV...), and for an
 * administrator the dashboard, where the Pufferfin settings also live.
 */
export const Component = () => {
    const t = useTranslation();
    const { user } = useApi();
    const pageRef = useRef<HTMLDivElement>(null);
    const { data: isQuickConnectEnabled } = useQuickConnectEnabled();
    const { data: userViews, isPending, isError } = useUserViews({ userId: user?.Id });
    // Custom links of the server web config, which the upstream header listed with the libraries
    const { menuLinks } = useWebConfig();

    const context = useMemo(() => ({
        userId: user?.Id,
        isAdministrator: !!user?.Policy?.IsAdministrator,
        isQuickConnectEnabled: !!isQuickConnectEnabled,
        supportsDownloadManager: appHost.supports(AppFeature.DownloadManagement),
        supportsClientSettings: appHost.supports(AppFeature.ClientSettings),
        supportsMultiServer: appHost.supports(AppFeature.MultiServer),
        supportsExit: appHost.supports(AppFeature.ExitMenu)
    }), [ user, isQuickConnectEnabled ]);
    const accountEntries = useMemo(() => getAccountEntries(context), [ context ]);
    const adminEntries = useMemo(() => getAdminEntries(context), [ context ]);

    // The focus starts on the first entry, which never waits for data: the profile or the settings
    useInitialFocus(pageRef, []);

    const views = useMemo(() => (userViews?.Items ?? []).filter(view => !!view.Id), [ userViews ]);

    let libraries: React.ReactNode;
    if (isPending) {
        libraries = <p className='pf-library__note' aria-busy='true'>{t('Loading')}</p>;
    } else if (isError) {
        // Failure is told with an icon and words, never with color alone
        libraries = (
            <p className='pf-row__error' role='status'>
                <ErrorOutline aria-hidden='true' />
                {t('MenuLibrariesLoadError')}
            </p>
        );
    } else {
        libraries = (
            <ul className='pf-menu__list'>
                {views.map(view => (
                    <li key={view.Id} className='pf-menu__item'>
                        {/* Library names come from the server, as the administrator typed them */}
                        <Link
                            to={appRouter.getRouteUrl(view, { context: view.CollectionType }).substring(1)}
                            className={LINK_CLASS_NAME}
                            {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                        >
                            <span className='pf-button__label'>{view.Name}</span>
                        </Link>
                    </li>
                ))}
                {menuLinks?.map(link => (
                    <li key={`${link.name}|${link.url}`} className='pf-menu__item'>
                        <a
                            href={link.url}
                            target='_blank'
                            rel='noopener noreferrer'
                            className={LINK_CLASS_NAME}
                            {...{ [FOCUSABLE_ATTRIBUTE]: true }}
                        >
                            <span className='pf-button__label'>{link.name}</span>
                        </a>
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <div ref={pageRef} className='pf-library pf-menu'>
            <h1 className='pf-library__title'>{t('NavMenu')}</h1>

            <section className='pf-menu__section' aria-labelledby='pf-menu-account' {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}>
                <h2 id='pf-menu-account' className='pf-row__title'>{t('MenuAccount')}</h2>
                <MenuEntries entries={accountEntries} />
            </section>

            {adminEntries.length > 0 && (
                <section className='pf-menu__section' aria-labelledby='pf-menu-admin' {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}>
                    <h2 id='pf-menu-admin' className='pf-row__title'>{t('MenuAdministration')}</h2>
                    <MenuEntries entries={adminEntries} />
                </section>
            )}

            <section
                className='pf-menu__section'
                aria-labelledby='pf-menu-libraries'
                aria-busy={isPending}
                {...{ [FOCUS_GROUP_ATTRIBUTE]: true }}
            >
                <h2 id='pf-menu-libraries' className='pf-row__title'>{t('MenuLibraries')}</h2>
                {libraries}
            </section>
        </div>
    );
};

Component.displayName = 'PufferfinMenuPage';
