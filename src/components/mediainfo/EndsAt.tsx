import React, { type FC } from 'react';
import classNames from 'classnames';
import Box from '@mui/material/Box';
import mediainfo from './mediainfo';

interface EndsAtProps {
    className?: string;
    runTimeTicks: number;
    positionTicks?: number;
    itemType?: string;
}

const EndsAt: FC<EndsAtProps> = ({ runTimeTicks, positionTicks, className, itemType }) => {
    const cssClass = classNames(
        'mediaInfoItem',
        'endsAt',
        className
    );

    const displayTime = mediainfo.getEndsAtFromPosition(runTimeTicks, positionTicks, 1, true, itemType);

    return (
        <Box className={cssClass}>
            {displayTime}
        </Box>
    );
};

export default EndsAt;
