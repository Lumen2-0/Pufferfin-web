import Download from '@mui/icons-material/Download';
import Extension from '@mui/icons-material/Extension';
import Hub from '@mui/icons-material/Hub';
import Movie from '@mui/icons-material/Movie';
import Translate from '@mui/icons-material/Translate';
import TravelExplore from '@mui/icons-material/TravelExplore';
import Tune from '@mui/icons-material/Tune';
import Tv from '@mui/icons-material/Tv';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import React from 'react';

import { translate, usePufferfinStrings } from 'apps/pufferfin/i18n';
import ListItemLink from 'components/ListItemLink';

import { getGroupPath, OVERVIEW_PATH, SETTINGS_GROUPS, SettingsGroupId } from '../constants/groups';

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
