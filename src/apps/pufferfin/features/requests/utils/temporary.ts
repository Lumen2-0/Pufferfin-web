import { type MediaRequest, RequestState, TemporaryExpiryOutcome } from '../api/types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whether a temporary film already left the library: its request no longer stands for the title. */
export const isExpiredRequest = (request: MediaRequest) =>
    request.ExpiryOutcome === TemporaryExpiryOutcome.Removed || request.ExpiryOutcome === TemporaryExpiryOutcome.AlreadyGone;

/** Whole days left before a date, rounded up, never below zero. */
export function getDaysLeft(expiresAt: string, now: number): number {
    const left = Date.parse(expiresAt) - now;
    return left <= 0 ? 0 : Math.ceil(left / DAY_MS);
}

/** A date as a day and a short month, in the language of the interface: "20 oct.". */
export function formatExpiryDate(expiresAt: string, locale?: string): string {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(expiresAt));
}

/** Where a temporary film stands. */
export type TemporaryState =
    /** Asked for a while only, not in the library yet. */
    | { kind: 'pending' }
    /** In the library until a date. */
    | { kind: 'until', expiresAt: string, daysLeft: number }
    /** Its time is up and it left the library. */
    | { kind: 'removed' }
    /** Its time is up, but it stays: someone else wants it, or an administrator decides. */
    | { kind: 'kept' };

/** Where the temporary film of a request stands, or undefined when the request is not temporary. */
export function getTemporaryState(request: MediaRequest | undefined, now: number): TemporaryState | undefined {
    if (!request?.Temporary) return undefined;
    if (isExpiredRequest(request)) return { kind: 'removed' };
    if (request.ExpiryOutcome) return { kind: 'kept' };
    if (request.State === RequestState.Available && request.ExpiresAt) {
        return { kind: 'until', expiresAt: request.ExpiresAt, daysLeft: getDaysLeft(request.ExpiresAt, now) };
    }
    // Available without an expiry: it was already there, it stays
    return request.State === RequestState.Available ? undefined : { kind: 'pending' };
}

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

/** A short time left, for a progress bar: under a minute, minutes, or hours and minutes. */
export type ShortEta =
    | { unit: 'under-minute' }
    | { unit: 'minutes', minutes: number }
    | { unit: 'hours', hours: number, minutes: number };

/** The time left of a download in short words, or undefined when unknown. */
export function getShortEta(etaSeconds: number | null | undefined): ShortEta | undefined {
    if (!etaSeconds || etaSeconds < 0) return undefined;
    const minutes = Math.ceil(etaSeconds / SECONDS_PER_MINUTE);
    if (minutes <= 1) return { unit: 'under-minute' };
    if (minutes < MINUTES_PER_HOUR) return { unit: 'minutes', minutes };
    return { unit: 'hours', hours: Math.floor(minutes / MINUTES_PER_HOUR), minutes: minutes % MINUTES_PER_HOUR };
}
