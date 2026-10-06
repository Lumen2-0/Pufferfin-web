import type { StringKey } from '../../../i18n/translate';
import type { CatalogAudiobookDetails, CatalogItem } from '../../catalog/api/types';

type Translate = (key: StringKey, ...args: Array<string | number>) => string;

const MINUTES_PER_HOUR = 60;
/** Audible ASINs: ten letters and digits. */
const ASIN_PATTERN = /^[A-Za-z0-9]{10}$/;

export const isAsin = (value: string | undefined): value is string => !!value && ASIN_PATTERN.test(value);

/** Facts line of an audiobook sheet: year, length, and the complete edition in words. */
export function getAudiobookMeta(book: CatalogAudiobookDetails, t: Translate): string[] {
    let length: string | undefined;
    if (book.RuntimeMinutes) {
        const hours = Math.floor(book.RuntimeMinutes / MINUTES_PER_HOUR);
        const minutes = book.RuntimeMinutes % MINUTES_PER_HOUR;
        length = hours ? t('DurationHoursMinutes', hours, minutes) : t('DurationMinutes', minutes);
    }
    return [
        book.Year ? String(book.Year) : undefined,
        length,
        book.IsCompleteEdition ? t('AudiobookCompleteEdition') : undefined
    ].filter((value): value is string => !!value);
}

/** Caption of an audiobook card: its first author, and the complete edition in words, next to the volumes. */
export function getAudiobookCaption(item: CatalogItem, t: Translate): string | undefined {
    const parts = [
        item.Authors?.[0],
        item.IsCompleteEdition ? t('AudiobookCompleteEdition') : undefined
    ].filter((value): value is string => !!value);
    return parts.length ? parts.join(', ') : undefined;
}
