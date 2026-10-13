import { describe, expect, it } from 'vitest';

import { getSensCritiqueUrl, parseReviewSite, ReviewSite } from './reviewSite';

describe('review site', () => {
    it('is Letterboxd unless SensCritique was chosen', () => {
        expect(parseReviewSite(null)).toBe(ReviewSite.Letterboxd);
        expect(parseReviewSite('something')).toBe(ReviewSite.Letterboxd);
        expect(parseReviewSite('senscritique')).toBe(ReviewSite.SensCritique);
    });

    it('searches SensCritique by the title and the year', () => {
        expect(getSensCritiqueUrl('Le Diable probablement', 1977))
            .toBe('https://www.senscritique.com/search?query=Le%20Diable%20probablement%201977');
        expect(getSensCritiqueUrl('Severance')).toBe('https://www.senscritique.com/search?query=Severance');
    });
});
