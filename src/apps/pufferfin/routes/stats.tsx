import React, { type FC, useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useApi } from 'hooks/useApi';

import MediaRow from '../components/MediaRow';
import PosterCard from '../components/PosterCard';
import LibraryDropdown, { type DropdownOption } from '../features/library/components/LibraryDropdown';
import { useWatchHistory } from '../features/stats/api/useWatchHistory';
import { computeStats, getWatchedYears, splitMinutes, type TitleStat } from '../features/stats/utils/stats';
import { useTranslation } from '../i18n/useTranslation';
import { useInitialFocus } from '../navigation/useInitialFocus';
import { getItemPosterUrl } from '../utils/images';
import { getItemPath } from './paths';

import '../features/library/library.scss';
import '../features/stats/stats.scss';

const ALL_YEARS = 'all';

const getTitleKey = (title: TitleStat) => title.id;

/** A row of posters: the titles of the period, each with the time spent on it. */
const TitleRow: FC<{ heading: string, titles: TitleStat[] }> = ({ heading, titles }) => {
    const t = useTranslation();
    const { api } = useApi();
    const navigate = useNavigate();
    const open = useCallback((title: TitleStat) => navigate(getItemPath(title.id)), [ navigate ]);
    const renderTitle = useCallback((title: TitleStat) => (
        <PosterCard
            title={title.name}
            subtitle={t('StatsHoursShort', Math.max(1, Math.round(title.minutes / 60)))}
            imageUrl={api ? getItemPosterUrl(api, title.id) : undefined}
            shape='portrait'
            value={title}
            onSelect={open}
        />
    ), [ api, open, t ]);
    return (
        <MediaRow
            title={heading}
            shape='portrait'
            items={titles}
            isPending={false}
            isError={false}
            getKey={getTitleKey}
            renderItem={renderTitle}
        />
    );
};

/** Personal statistics: time watched, titles, favourite genres and the busiest month, over a year or the whole history. */
export const Component = () => {
    const t = useTranslation();
    const pageRef = useRef<HTMLDivElement>(null);
    const history = useWatchHistory();
    const [ choice, setChoice ] = useState(ALL_YEARS);
    useInitialFocus(pageRef, [], !history.isPending);

    const years = useMemo(() => getWatchedYears(history.data?.items ?? []), [ history.data ]);
    const year = choice === ALL_YEARS ? undefined : Number(choice);
    const stats = useMemo(
        () => history.data && computeStats(history.data.items, history.data.seriesGenres, year),
        [ history.data, year ]
    );
    const options = useMemo<DropdownOption<string>[]>(() => [
        { id: ALL_YEARS, label: t('StatsAllTime') },
        ...years.map(item => ({ id: String(item), label: String(item) }))
    ], [ t, years ]);
    const onSelect = useCallback((id: string) => setChoice(id), []);

    const duration = stats && splitMinutes(stats.minutes);
    const topMinutes = stats?.topGenres[0]?.minutes || 1;
    const { api } = useApi();
    const days = stats ? (stats.minutes / 60 / 24).toFixed(1) : '0';

    return (
        <div ref={pageRef} className='pf-stats'>
            <header className='pf-stats__header'>
                <h1 className='pf-stats__title'>{t('StatsTitle')}</h1>
                {stats && (
                    <LibraryDropdown
                        label={options.find(option => option.id === choice)?.label ?? t('StatsAllTime')}
                        ariaLabel={t('StatsPeriod')}
                        options={options}
                        selectedId={choice}
                        onSelect={onSelect}
                        align='end'
                    />
                )}
            </header>
            {history.isError && <p className='pf-stats__empty'>{t('StatsError')}</p>}
            {stats && duration && stats.minutes === 0 && <p className='pf-stats__empty'>{t('StatsEmpty')}</p>}
            {stats && duration && stats.minutes > 0 && (
                <>
                    <section className='pf-stats__hero'>
                        <p className='pf-stats__hero-label'>{t('StatsWatched')}</p>
                        <p className='pf-stats__hero-value'>{t('StatsDuration', duration.hours, String(duration.minutes).padStart(2, '0'))}</p>
                        <p className='pf-stats__hero-sub'>{t('StatsDays', days)}</p>
                        <dl className='pf-stats__facts'>
                            <div className='pf-stats__fact'>
                                <dd>{stats.movies}</dd>
                                <dt>{t('StatsMovies')}</dt>
                            </div>
                            <div className='pf-stats__fact'>
                                <dd>{stats.episodes}</dd>
                                <dt>{t('StatsEpisodes')}</dt>
                            </div>
                            {stats.busiestMonth !== undefined && (
                                <div className='pf-stats__fact'>
                                    <dd>{new Date(2000, stats.busiestMonth, 1).toLocaleDateString(undefined, { month: 'long' })}</dd>
                                    <dt>{t('StatsBusiestMonth')}</dt>
                                </div>
                            )}
                        </dl>
                        <div className='pf-stats__collage' aria-hidden='true'>
                            {api && stats.topTitles.slice(0, 4).map(title => (
                                <img key={title.id} className='pf-stats__collage-poster' src={getItemPosterUrl(api, title.id)} alt='' loading='lazy' />
                            ))}
                        </div>
                    </section>

                    <TitleRow heading={t('StatsTopTitles')} titles={stats.topTitles} />
                    <TitleRow heading={t('StatsRecent')} titles={stats.recent} />

                    {stats.topGenres.length > 0 && (
                        <section className='pf-stats__genres' aria-label={t('StatsGenres')}>
                            <h2 className='pf-stats__heading'>{t('StatsGenres')}</h2>
                            <ol className='pf-stats__list'>
                                {stats.topGenres.map((genre, index) => (
                                    <li key={genre.name} className='pf-stats__genre'>
                                        <span className='pf-stats__rank'>{index + 1}</span>
                                        <span className='pf-stats__genre-name'>{genre.name}</span>
                                        <span className='pf-stats__bar' aria-hidden='true'>
                                            <span className='pf-stats__bar-fill' style={{ width: `${Math.round((genre.minutes / topMinutes) * 100)}%` }} />
                                        </span>
                                        <span className='pf-stats__genre-time'>{t('StatsHoursShort', Math.round(genre.minutes / 60))}</span>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}
                    <p className='pf-stats__note'>{t(year === undefined ? 'StatsNoteAll' : 'StatsNoteYear')}</p>
                </>
            )}
        </div>
    );
};
