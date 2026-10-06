import { useTheme } from '@mui/material/styles';
import type { MRT_Theme } from 'material-react-table';
import { useMemo } from 'react';

/**
 * The table theme of the dashboard. Like the upstream tables, it is given explicitly because of a bug of
 * material-react-table that keeps the initial theme: https://github.com/KevinVandy/material-react-table/issues/1429
 */
export const useTableTheme = () => {
    const theme = useTheme();

    return useMemo<Partial<MRT_Theme>>(() => ({
        baseBackgroundColor: theme.palette.background.paper
    }), [ theme ]);
};
