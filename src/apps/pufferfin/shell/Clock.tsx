import React, { type FC, useEffect, useState } from 'react';

import layoutManager from 'components/layoutManager';
import { getDisplayTime } from 'scripts/datetime';

const TICK_MS = 1000;

/** The time of day the upstream header shows in the TV layout, where no system clock is in sight. */
const Clock: FC = () => {
    const [ now, setNow ] = useState(() => new Date());

    useEffect(() => {
        if (!layoutManager.tv) return;
        const timer = window.setInterval(() => setNow(new Date()), TICK_MS);
        return () => window.clearInterval(timer);
    }, []);

    if (!layoutManager.tv) return null;
    return <span className='pf-nav__clock'>{getDisplayTime(now)}</span>;
};

export default Clock;
