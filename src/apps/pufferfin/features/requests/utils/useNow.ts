import { useEffect, useState } from 'react';

const CLOCK_TICK_MS = 5000;

/** Re-renders on a slow tick while asked to, so an old state gets marked as such without new data. */
export const useNow = (isTicking: boolean) => {
    const [ now, setNow ] = useState(() => Date.now());
    useEffect(() => {
        if (!isTicking) return;
        setNow(Date.now());
        const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
        return () => clearInterval(timer);
    }, [ isTicking ]);
    return now;
};
