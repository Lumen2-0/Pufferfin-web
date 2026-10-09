import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import React from 'react';

import { translate, usePufferfinStrings } from 'apps/pufferfin/i18n';
import ListItemLink from 'components/ListItemLink';

import { getGroupPath, OVERVIEW_PATH, SETTINGS_GROUPS, SettingsGroupId } from '../constants/groups';
import { ADMIN_PAGES, AdminPageId, getAdminPagePath } from '../constants/pages';
import { Download, Extension, Hub, ManageAccounts, Movie, Queue, Storage, Translate, TravelExplore, Tune, Tv } from '../../components/icons';

const PAGE_ICONS: Record<AdminPageId, React.ReactElement> = {
    [AdminPageId.Requests]: <Queue />,
    [AdminPageId.Users]: <ManageAccounts />,
    [AdminPageId.Storage]: <Storage />
};

const PAGE_TITLES = {
    [AdminPageId.Requests]: 'AdminRequests',
    [AdminPageId.Users]: 'AdminUsers',
    [AdminPageId.Storage]: 'AdminStorage'
} as const;

const GROUP_ICONS: Record<SettingsGroupId, React.ReactElement> = {
    [SettingsGroupId.Catalogs]: <TravelExplore />,
    [SettingsGroupId.Movies]: <Movie />,
    [SettingsGroupId.Series]: <Tv />,
    [SettingsGroupId.Downloads]: <Download />,
    [SettingsGroupId.Optional]: <Extension />,
    [SettingsGroupId.Language]: <Translate />,
    [SettingsGroupId.Behavior]: <Tune />
};

/** The Pufferfin section of the admin dashboard menu. */
const PufferfinDrawerSection = () => {
    // Re-renders once the strings of the current language are loaded.
    usePufferfinStrings();

    return (
        <List
            aria-labelledby='pufferfin-subheader'
            subheader={
                <ListSubheader component='div' id='pufferfin-subheader'>
                    {translate('AdminSectionTitle')}
                </ListSubheader>
            }
        >
            <ListItem disablePadding>
                <ListItemLink to={OVERVIEW_PATH}>
                    <ListItemIcon>
                        <Hub />
                    </ListItemIcon>
                    <ListItemText primary={translate('AdminOverview')} />
                </ListItemLink>
            </ListItem>
            {ADMIN_PAGES.map(page => (
                <ListItem key={page} disablePadding>
                    <ListItemLink to={getAdminPagePath(page)}>
                        <ListItemIcon>
                            {PAGE_ICONS[page]}
                        </ListItemIcon>
                        <ListItemText primary={translate(PAGE_TITLES[page])} />
                    </ListItemLink>
                </ListItem>
            ))}
            {SETTINGS_GROUPS.map(group => (
                <ListItem key={group.id} disablePadding>
                    <ListItemLink to={getGroupPath(group.id)}>
                        <ListItemIcon>
                            {GROUP_ICONS[group.id]}
                        </ListItemIcon>
                        <ListItemText primary={translate(`Group.${group.id}`)} />
                    </ListItemLink>
                </ListItem>
            ))}
        </List>
    );
};

export default PufferfinDrawerSection;
