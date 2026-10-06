// Numbers are formatted by the browser in the language of the interface: units such as "GB" or "days" are
// translated by Intl, not by the Pufferfin dictionaries.

const BYTE_UNITS = [ 'byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte' ];
const BYTE_STEP = 1000;

/** Formats a size in bytes with the largest unit that keeps the value at or above 1, for example "1.5 GB". */
export const formatBytes = (bytes: number, locale?: string): string => {
    let value = Math.max(0, bytes);
    let unit = 0;
    while (value >= BYTE_STEP && unit < BYTE_UNITS.length - 1) {
        value /= BYTE_STEP;
        unit++;
    }

    return new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: BYTE_UNITS[unit],
        unitDisplay: 'short',
        maximumFractionDigits: unit === 0 ? 0 : 1
    }).format(value);
};

/** Formats a number of days, for example "3.5 days". */
export const formatDays = (days: number, locale?: string): string => (
    new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'day',
        unitDisplay: 'long',
        maximumFractionDigits: 1
    }).format(days)
);

/** Formats a ratio such as 1.25. */
export const formatRatio = (ratio: number, locale?: string): string => (
    new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(ratio)
);

/** Formats a fraction from 0 to 1 as a percentage. */
export const formatPercent = (fraction: number, locale?: string): string => (
    new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(fraction)
);

const SECONDS_PER_DAY = 86400;
const TIME_SPAN_REGEX = /^(-)?(?:(\d+)\.)?(\d+):(\d+):(\d+(?:\.\d+)?)$/;

/** Reads a .NET time span such as `3.04:05:06.789` as a number of days. Returns 0 when it cannot be read. */
export const parseTimeSpanDays = (timeSpan: string | null | undefined): number => {
    const match = TIME_SPAN_REGEX.exec(timeSpan ?? '');
    if (!match) return 0;

    const [ , sign, days, hours, minutes, seconds ] = match;
    const total = (Number(days ?? 0) * SECONDS_PER_DAY)
        + (Number(hours) * 3600)
        + (Number(minutes) * 60)
        + Number(seconds);

    return (sign ? -total : total) / SECONDS_PER_DAY;
};
