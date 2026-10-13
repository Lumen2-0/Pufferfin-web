/** The site a sheet links to for the reviews of a title: one of the two, as the user chose in the settings. */
export enum ReviewSite {
    Letterboxd = 'letterboxd',
    SensCritique = 'senscritique'
}

export const REVIEW_SITE_SETTING = 'pufferfin-review-site';

export const parseReviewSite = (value: string | null | undefined) =>
    (value === ReviewSite.SensCritique ? ReviewSite.SensCritique : ReviewSite.Letterboxd);

/** A title on SensCritique, which has no address by TMDB id: its search, by the title and the year. */
export const getSensCritiqueUrl = (title: string, year?: number | null) =>
    `https://www.senscritique.com/search?query=${encodeURIComponent([ title, year ].filter(Boolean).join(' '))}`;
