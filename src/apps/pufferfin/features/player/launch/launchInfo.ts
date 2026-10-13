/** The few fields of an item the launch screen reads. */
export interface LaunchItem {
    Id?: string | null;
    Type?: string | null;
    Name?: string | null;
    SeriesName?: string | null;
    ParentIndexNumber?: number | null;
    IndexNumber?: number | null;
    ProductionYear?: number | null;
    BackdropImageTags?: string[] | null;
    ParentBackdropItemId?: string | null;
    ParentBackdropImageTags?: string[] | null;
    ImageTags?: Record<string, string> | null;
    ParentLogoItemId?: string | null;
    ParentLogoImageTag?: string | null;
}

/** An image of the server: the item it belongs to, its type and its tag. */
export interface LaunchImage {
    itemId: string;
    type: 'Backdrop' | 'Primary' | 'Logo';
    tag: string;
}

/** What the launch screen shows while a video gets going. */
export interface LaunchInfo {
    /** The title in words, also the alternative text of the logo. */
    title: string;
    /** Under the title: "S1, É2 · Name" for an episode, the year for a film. */
    detail?: string;
    backdrop?: LaunchImage;
    logo?: LaunchImage;
}

/**
 * Picks the picture and the words of the launch screen: the backdrop of the
 * title, else the still of the episode, else the backdrop of its series; the
 * logo when there is one, the title in words otherwise.
 */
export function getLaunchInfo(item: LaunchItem, formatEpisode: (season: number, episode: number) => string): LaunchInfo {
    const id = item.Id ?? '';
    const isEpisode = item.Type === 'Episode';

    let backdrop: LaunchImage | undefined;
    if (id && item.BackdropImageTags?.length) {
        backdrop = { itemId: id, type: 'Backdrop', tag: item.BackdropImageTags[0] };
    } else if (id && isEpisode && item.ImageTags?.Primary) {
        backdrop = { itemId: id, type: 'Primary', tag: item.ImageTags.Primary };
    } else if (item.ParentBackdropItemId && item.ParentBackdropImageTags?.length) {
        backdrop = { itemId: item.ParentBackdropItemId, type: 'Backdrop', tag: item.ParentBackdropImageTags[0] };
    }

    let logo: LaunchImage | undefined;
    if (id && item.ImageTags?.Logo) {
        logo = { itemId: id, type: 'Logo', tag: item.ImageTags.Logo };
    } else if (item.ParentLogoItemId && item.ParentLogoImageTag) {
        logo = { itemId: item.ParentLogoItemId, type: 'Logo', tag: item.ParentLogoImageTag };
    }

    if (isEpisode) {
        const hasNumbers = item.ParentIndexNumber != null && item.IndexNumber != null;
        const numbers = hasNumbers ? formatEpisode(item.ParentIndexNumber!, item.IndexNumber!) : undefined;
        const detail = [ numbers, item.Name ].filter(Boolean).join(' · ');
        return {
            title: item.SeriesName || item.Name || '',
            detail: detail || undefined,
            backdrop,
            logo
        };
    }

    return {
        title: item.Name ?? '',
        detail: item.ProductionYear ? String(item.ProductionYear) : undefined,
        backdrop,
        logo
    };
}
