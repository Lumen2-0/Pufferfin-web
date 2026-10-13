import { MediaSegmentType } from '@jellyfin/sdk/lib/generated-client/models/media-segment-type';
import type { UserConfiguration } from '@jellyfin/sdk/lib/generated-client/models/user-configuration';
import type { UserDto } from '@jellyfin/sdk/lib/generated-client/models/user-dto';
import classNames from 'classnames';
import React, { type ChangeEvent, type FC, type FormEvent, type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useApi } from 'hooks/useApi';
import { useQuickConnectEnabled } from 'hooks/useQuickConnect';
import { currentSettings as userSettings } from 'scripts/settings/userSettings';
import { MediaSegmentAction } from 'apps/legacy/features/playback/constants/mediaSegmentAction';
import { getId as getSegmentSettingId, getMediaSegmentAction } from 'apps/legacy/features/playback/utils/mediaSegmentSettings';

import { Check, Close, Download, type IconProps, Lock, ManageAccounts, MenuBook, PlayArrow, Translate, Tune, Tv } from '../../components/icons';
import { type GenreKey, GENRE_PREFERENCES } from '../preferences/genres';
import { useHiddenGenres } from '../preferences/useHiddenGenres';
import type { StringKey } from '../../i18n/translate';
import { useTranslation } from '../../i18n/useTranslation';

import {
    getAvatarUrl,
    useAuthorizeQuickConnect,
    MAX_AVATAR_BYTES,
    useChangeAvatar,
    useChangePassword,
    useCultures,
    useInterfaceLanguages,
    useMe,
    type PufferfinUserSettings,
    usePufferfinUserSettings,
    useSaveConfiguration,
    useSavePufferfinUserSettings
} from './api';
import { FormNote, type SelectOption, Select, SettingRow, SettingsButton, Switch, TextField } from './components/fields';
import { useReviewSite } from '../reviews/ReviewLink';
import { parseReviewSite, ReviewSite } from '../reviews/reviewSite';
import { closeSettings, openSettings, SETTINGS_SECTIONS, SettingsSection, useOpenSettingsSection } from './store';

import './settings.scss';

const SECTION_LABELS: Record<SettingsSection, StringKey> = {
    [SettingsSection.Profile]: 'SettingsSectionProfile',
    [SettingsSection.Preferences]: 'SettingsSectionPreferences',
    [SettingsSection.Playback]: 'SettingsSectionPlayback',
    [SettingsSection.Subtitles]: 'SettingsSectionSubtitles',
    [SettingsSection.Downloads]: 'SettingsSectionDownloads',
    [SettingsSection.Interface]: 'SettingsSectionInterface',
    [SettingsSection.Devices]: 'SettingsSectionDevices'
};

const SECTION_ICONS: Record<SettingsSection, FC<IconProps>> = {
    [SettingsSection.Profile]: ManageAccounts,
    [SettingsSection.Preferences]: Tune,
    [SettingsSection.Playback]: PlayArrow,
    [SettingsSection.Subtitles]: MenuBook,
    [SettingsSection.Downloads]: Download,
    [SettingsSection.Interface]: Translate,
    [SettingsSection.Devices]: Tv
};

const SUBTITLE_MODES: Array<{ value: string, label: StringKey }> = [
    { value: 'Default', label: 'SubtitleModeDefault' },
    { value: 'Smart', label: 'SubtitleModeSmart' },
    { value: 'Always', label: 'SubtitleModeAlways' },
    { value: 'OnlyForced', label: 'SubtitleModeOnlyForced' },
    { value: 'None', label: 'SubtitleModeNone' }
];

/** The download languages offered: the ones requests take, ISO 639-1. */
const DOWNLOAD_LANGUAGES = [ 'fr', 'en', 'ja', 'es', 'it', 'de', 'ko', 'pt', 'zh', 'ru', 'nl', 'ar', 'hi' ];

/** A short "Saved" after a change, which fades by itself. */
function useSavedFlash() {
    const [ savedAt, setSavedAt ] = useState(0);
    useEffect(() => {
        if (!savedAt) return;
        const timer = setTimeout(() => setSavedAt(0), 1800);
        return () => clearTimeout(timer);
    }, [ savedAt ]);
    return { isSaved: savedAt > 0, flash: useCallback(() => setSavedAt(Date.now()), []) };
}

/** The language lists of audio and subtitles, from the cultures of the server, by name. */
function useLanguageOptions(anyLabel: string): SelectOption[] {
    const { data: cultures } = useCultures();
    return useMemo(() => [
        { value: '', label: anyLabel },
        ...(cultures ?? [])
            .filter(culture => !!culture.ThreeLetterISOLanguageName && !!culture.DisplayName)
            .map(culture => ({ value: culture.ThreeLetterISOLanguageName!, label: culture.DisplayName! }))
            .sort((a, b) => a.label.localeCompare(b.label))
    ], [ anyLabel, cultures ]);
}

interface SectionProps {
    me: UserDto
    save: (change: Partial<UserConfiguration>) => void
}

type ConfigKey = keyof UserConfiguration;

/** A switch bound to one setting of the server side configuration of the user. */
const ConfigSwitch: FC<{ label: string, checked: boolean, field: ConfigKey, save: SectionProps['save'] }> = ({ label, checked, field, save }) => {
    const onChange = useCallback((value: boolean) => save({ [field]: value }), [ field, save ]);
    return <Switch label={label} checked={checked} onChange={onChange} />;
};

/** A select bound to one setting of the server side configuration; an empty choice clears it. */
const ConfigSelect: FC<{ id: string, value: string, options: SelectOption[], field: ConfigKey, save: SectionProps['save'] }> = ({
    id, value, options, field, save
}) => {
    const onChange = useCallback((next: string) => save({ [field]: next || null }), [ field, save ]);
    return <Select id={id} value={value} options={options} onChange={onChange} />;
};

const ProfileSection: FC<{ me: UserDto }> = ({ me }) => {
    const t = useTranslation();
    const { api } = useApi();
    const fileRef = useRef<HTMLInputElement>(null);
    const avatar = useChangeAvatar();
    const password = useChangePassword();
    const [ current, setCurrent ] = useState('');
    const [ next, setNext ] = useState('');
    const [ confirm, setConfirm ] = useState('');
    const [ mismatch, setMismatch ] = useState(false);
    const avatarUrl = getAvatarUrl(api, me);
    const [ isTooLarge, setIsTooLarge ] = useState(false);

    const onPick = useCallback(() => fileRef.current?.click(), []);
    const onFile = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || !me.Id) return;
        setIsTooLarge(file.size > MAX_AVATAR_BYTES);
        if (file.size > MAX_AVATAR_BYTES) return;
        avatar.mutate({ userId: me.Id, file });
    }, [ avatar, me.Id ]);
    const onRemove = useCallback(() => {
        if (me.Id) avatar.mutate({ userId: me.Id, file: null });
    }, [ avatar, me.Id ]);

    const onSubmit = useCallback((event: FormEvent) => {
        event.preventDefault();
        if (next !== confirm) {
            setMismatch(true);
            return;
        }
        setMismatch(false);
        if (!me.Id) return;
        password.mutate({ userId: me.Id, current, next }, {
            onSuccess: () => {
                setCurrent('');
                setNext('');
                setConfirm('');
            }
        });
    }, [ confirm, current, me.Id, next, password ]);

    return (
        <>
            <div className='pf-profile-card'>
                <span className='pf-profile-card__avatar'>
                    {avatarUrl ? <img src={avatarUrl} alt='' /> : <span aria-hidden='true'>{(me.Name ?? '?').slice(0, 1).toUpperCase()}</span>}
                </span>
                <div className='pf-profile-card__text'>
                    <p className='pf-profile-card__name'>{me.Name}</p>
                    {me.Policy?.IsAdministrator && <p className='pf-profile-card__role'>{t('ProfileAdministrator')}</p>}
                </div>
                <div className='pf-profile-card__actions'>
                    <input ref={fileRef} type='file' accept='image/jpeg,image/png,image/webp,image/gif' hidden onChange={onFile} />
                    <SettingsButton onClick={onPick} disabled={avatar.isPending}>{t('ProfileAvatarChange')}</SettingsButton>
                    {me.PrimaryImageTag && <SettingsButton onClick={onRemove} disabled={avatar.isPending}>{t('ProfileAvatarRemove')}</SettingsButton>}
                </div>
            </div>
            <p className='pf-settings__hint'>{t('ProfilePictureHint')}</p>
            {isTooLarge && <FormNote tone='error'>{t('ProfilePictureTooLarge')}</FormNote>}
            {avatar.isError && <FormNote tone='error'>{t('ProfilePictureError')}</FormNote>}

            <form className='pf-settings-form' onSubmit={onSubmit}>
                <h3 className='pf-settings-form__title'>
                    <Lock fontSize='inherit' aria-hidden='true' />
                    {t('ProfilePassword')}
                </h3>
                <label className='pf-settings-form__field'>
                    <span>{t('ProfilePasswordCurrent')}</span>
                    <TextField type='password' value={current} onChange={setCurrent} autoComplete='current-password' />
                </label>
                <label className='pf-settings-form__field'>
                    <span>{t('ProfilePasswordNew')}</span>
                    <TextField type='password' value={next} onChange={setNext} autoComplete='new-password' />
                </label>
                <label className='pf-settings-form__field'>
                    <span>{t('ProfilePasswordConfirm')}</span>
                    <TextField type='password' value={confirm} onChange={setConfirm} autoComplete='new-password' />
                </label>
                <div className='pf-settings-form__actions'>
                    <SettingsButton type='submit' variant='primary' disabled={password.isPending || !next}>{t('ProfilePasswordSave')}</SettingsButton>
                </div>
                {mismatch && <FormNote tone='error'>{t('ProfilePasswordMismatch')}</FormNote>}
                {password.isError && <FormNote tone='error'>{t('ProfilePasswordError')}</FormNote>}
                {password.isSuccess && <FormNote tone='success'>{t('ProfilePasswordDone')}</FormNote>}
            </form>
        </>
    );
};

/** The parts of an episode or a film Intro Skipper finds, in the order they play. */
const SKIPPABLE_SEGMENTS: Array<{ type: MediaSegmentType, label: StringKey }> = [
    { type: MediaSegmentType.Recap, label: 'SkipSegmentRecap' },
    { type: MediaSegmentType.Intro, label: 'SkipSegmentIntro' },
    { type: MediaSegmentType.Commercial, label: 'SkipSegmentCommercial' },
    { type: MediaSegmentType.Outro, label: 'SkipSegmentOutro' },
    { type: MediaSegmentType.Preview, label: 'SkipSegmentPreview' }
];

/** What the player does with one kind of segment: offer a Skip button, skip it, or nothing. Kept on this device. */
const SegmentSelect: FC<{ type: MediaSegmentType, label: string }> = ({ type, label }) => {
    const t = useTranslation();
    const [ value, setValue ] = useState<string>(() => getMediaSegmentAction(userSettings, type));
    const options = useMemo<SelectOption[]>(() => [
        { value: MediaSegmentAction.AskToSkip, label: t('SkipActionAsk') },
        { value: MediaSegmentAction.Skip, label: t('SkipActionAuto') },
        { value: MediaSegmentAction.None, label: t('SkipActionNone') }
    ], [ t ]);
    const onChange = useCallback((next: string) => {
        userSettings.set(getSegmentSettingId(type), next, false);
        setValue(next);
    }, [ type ]);
    return <Select id={`pf-skip-${type}`} value={value} options={options} onChange={onChange} label={label} />;
};

const PlaybackSection: FC<SectionProps> = ({ me, save }) => {
    const t = useTranslation();
    const config = me.Configuration ?? {};
    const languages = useLanguageOptions(t('LanguageAny'));
    return (
        <>
            <SettingRow label={t('PlaybackAudioLanguage')} description={t('PlaybackAudioLanguageHint')} htmlFor='pf-audio-language'>
                <ConfigSelect id='pf-audio-language' value={config.AudioLanguagePreference ?? ''} options={languages} field='AudioLanguagePreference' save={save} />
            </SettingRow>
            <SettingRow label={t('PlaybackDefaultTrack')} description={t('PlaybackDefaultTrackHint')}>
                <ConfigSwitch label={t('PlaybackDefaultTrack')} checked={!!config.PlayDefaultAudioTrack} field='PlayDefaultAudioTrack' save={save} />
            </SettingRow>
            <SettingRow label={t('PlaybackNextEpisode')}>
                <ConfigSwitch label={t('PlaybackNextEpisode')} checked={config.EnableNextEpisodeAutoPlay !== false} field='EnableNextEpisodeAutoPlay' save={save} />
            </SettingRow>
            <SettingRow label={t('PlaybackRememberAudio')} description={t('PlaybackRememberHint')}>
                <ConfigSwitch label={t('PlaybackRememberAudio')} checked={config.RememberAudioSelections !== false} field='RememberAudioSelections' save={save} />
            </SettingRow>
            <SettingRow label={t('PlaybackRememberSubtitles')}>
                <ConfigSwitch label={t('PlaybackRememberSubtitles')} checked={config.RememberSubtitleSelections !== false} field='RememberSubtitleSelections' save={save} />
            </SettingRow>
            {SKIPPABLE_SEGMENTS.map(({ type, label }, index) => (
                <SettingRow
                    key={type}
                    label={t(label)}
                    description={index === 0 ? t('SkipSegmentsHint') : undefined}
                    htmlFor={`pf-skip-${type}`}
                >
                    <SegmentSelect type={type} label={t(label)} />
                </SettingRow>
            ))}
        </>
    );
};

const SubtitlesSection: FC<SectionProps> = ({ me, save }) => {
    const t = useTranslation();
    const config = me.Configuration ?? {};
    const languages = useLanguageOptions(t('LanguageAny'));
    const modes = useMemo(() => SUBTITLE_MODES.map(mode => ({ value: mode.value, label: t(mode.label) })), [ t ]);
    return (
        <>
            <SettingRow label={t('SubtitleLanguage')} htmlFor='pf-subtitle-language'>
                <ConfigSelect id='pf-subtitle-language' value={config.SubtitleLanguagePreference ?? ''} options={languages} field='SubtitleLanguagePreference' save={save} />
            </SettingRow>
            <SettingRow label={t('SubtitleMode')} description={t('SubtitleModeHint')} htmlFor='pf-subtitle-mode'>
                <ConfigSelect id='pf-subtitle-mode' value={config.SubtitleMode ?? 'Default'} options={modes} field='SubtitleMode' save={save} />
            </SettingRow>
        </>
    );
};

/** One chosen download language, with its rank and a button to take it out. */
const LanguageChip: FC<{ code: string, rank: number, name: string, onRemove: (code: string) => void }> = ({ code, rank, name, onRemove }) => {
    const t = useTranslation();
    const onClick = useCallback(() => onRemove(code), [ code, onRemove ]);
    return (
        <span className='pf-chip'>
            <span className='pf-chip__rank'>{rank}</span>
            {name}
            <button type='button' className='pf-chip__remove' aria-label={t('DownloadsRemoveLanguage', name)} onClick={onClick}>
                <Close fontSize='inherit' aria-hidden='true' />
            </button>
        </span>
    );
};

const NO_LANGUAGES: string[] = [];

const DownloadsSection: FC<{ onSaved: () => void }> = ({ onSaved }) => {
    const t = useTranslation();
    const { data: settings } = usePufferfinUserSettings();
    const save = useSavePufferfinUserSettings();
    const [ letterboxd, setLetterboxd ] = useState<string>();
    const chosen = settings?.PreferredAudioLanguages ?? NO_LANGUAGES;
    const names = useMemo(() => new Intl.DisplayNames([ document.documentElement.lang || 'fr' ], { type: 'language' }), []);
    const nameOf = useCallback((code: string) => {
        try {
            const name = names.of(code) ?? code;
            return name.charAt(0).toUpperCase() + name.slice(1);
        } catch {
            return code;
        }
    }, [ names ]);

    const update = useCallback((change: Partial<PufferfinUserSettings>) => {
        save.mutate({ ...settings, ...change }, { onSuccess: onSaved });
    }, [ onSaved, save, settings ]);
    const onRemove = useCallback((code: string) => update({ PreferredAudioLanguages: chosen.filter(item => item !== code) }), [ chosen, update ]);
    const onAdd = useCallback((code: string) => {
        if (code) update({ PreferredAudioLanguages: [ ...chosen, code ] });
    }, [ chosen, update ]);
    const onLetterboxdBlur = useCallback(() => {
        if (letterboxd !== undefined && letterboxd !== (settings?.LetterboxdUsername ?? '')) update({ LetterboxdUsername: letterboxd || null });
    }, [ letterboxd, settings?.LetterboxdUsername, update ]);

    const addOptions = useMemo(() => [
        { value: '', label: t('DownloadsAddLanguage') },
        ...DOWNLOAD_LANGUAGES.filter(code => !chosen.includes(code)).map(code => ({ value: code, label: nameOf(code) }))
    ], [ chosen, nameOf, t ]);

    return (
        <>
            <SettingRow label={t('DownloadsLanguages')} description={t('DownloadsLanguagesHint')} stacked>
                <div className='pf-chips'>
                    {chosen.map((code, index) => (
                        <LanguageChip key={code} code={code} rank={index + 1} name={nameOf(code)} onRemove={onRemove} />
                    ))}
                    <Select value='' options={addOptions} label={t('DownloadsAddLanguage')} onChange={onAdd} />
                </div>
            </SettingRow>
            <SettingRow label={t('LetterboxdAccount')} description={t('LetterboxdAccountHint')} htmlFor='pf-letterboxd'>
                <TextField
                    id='pf-letterboxd'
                    value={letterboxd ?? settings?.LetterboxdUsername ?? ''}
                    onChange={setLetterboxd}
                    onBlur={onLetterboxdBlur}
                    placeholder='username'
                />
            </SettingRow>
            {save.isError && <FormNote tone='error'>{t('SettingsSaveError')}</FormNote>}
        </>
    );
};

/** One genre of the preferences: checked, its titles show on Discover and in the search. */
const GenreCheck: FC<{ genre: GenreKey, label: string, checked: boolean, onChange: (genre: GenreKey, checked: boolean) => void }> = ({
    genre, label, checked, onChange
}) => {
    const onInput = useCallback((event: ChangeEvent<HTMLInputElement>) => onChange(genre, event.target.checked), [ genre, onChange ]);
    return (
        <label className='pf-genre-check'>
            <input type='checkbox' className='pf-genre-check__input' checked={checked} onChange={onInput} />
            <span className='pf-genre-check__box' aria-hidden='true'><Check fontSize='inherit' /></span>
            <span className='pf-genre-check__label'>{label}</span>
        </label>
    );
};

/** The genres of Discover and the search: all of them shown until the user unchecks some. */
const PreferencesSection: FC = () => {
    const t = useTranslation();
    const { hidden, setShown, showAll } = useHiddenGenres();
    const genres = useMemo(
        () => GENRE_PREFERENCES
            .map(genre => ({ key: genre.key, label: t(genre.label) }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        [ t ]
    );
    return (
        <SettingRow label={t('PreferencesGenres')} description={t('PreferencesGenresHint')} stacked>
            <div className='pf-genre-checks'>
                {genres.map(genre => (
                    <GenreCheck key={genre.key} genre={genre.key} label={genre.label} checked={!hidden.has(genre.key)} onChange={setShown} />
                ))}
            </div>
            {hidden.size > 0 && (
                <div className='pf-settings-form__actions'>
                    <SettingsButton onClick={showAll}>{t('PreferencesShowAll')}</SettingsButton>
                </div>
            )}
        </SettingRow>
    );
};

const InterfaceSection: FC = () => {
    const t = useTranslation();
    const { data: options } = useInterfaceLanguages();
    const [ language, setLanguage ] = useState(() => userSettings.language() ?? '');
    const choices = useMemo(() => [
        { value: '', label: t('InterfaceLanguageAuto') },
        ...(options ?? []).filter(option => !!option.Value).map(option => ({ value: option.Value!, label: option.Name ?? option.Value! }))
    ], [ options, t ]);
    const onChange = useCallback((value: string) => {
        setLanguage(value);
        // An empty value follows the language of the browser again
        userSettings.language(value);
        // The whole interface takes the new language on a fresh start
        setTimeout(() => window.location.reload(), 300);
    }, []);
    const [ reviewSite, setReviewSite ] = useReviewSite();
    const reviewSites = useMemo<SelectOption[]>(() => [
        { value: ReviewSite.Letterboxd, label: 'Letterboxd' },
        { value: ReviewSite.SensCritique, label: 'SensCritique' }
    ], []);
    const onReviewSiteChange = useCallback((value: string) => setReviewSite(parseReviewSite(value)), [ setReviewSite ]);
    return (
        <>
            <SettingRow label={t('InterfaceLanguage')} description={t('InterfaceLanguageHint')} htmlFor='pf-interface-language'>
                <Select id='pf-interface-language' value={language} options={choices} onChange={onChange} />
            </SettingRow>
            <SettingRow label={t('ReviewSite')} description={t('ReviewSiteHint')} htmlFor='pf-review-site'>
                <Select id='pf-review-site' value={reviewSite} options={reviewSites} onChange={onReviewSiteChange} />
            </SettingRow>
        </>
    );
};

const DevicesSection: FC<{ me: UserDto }> = ({ me }) => {
    const t = useTranslation();
    const { data: isEnabled } = useQuickConnectEnabled();
    const authorize = useAuthorizeQuickConnect();
    const [ code, setCode ] = useState('');
    const onSubmit = useCallback((event: FormEvent) => {
        event.preventDefault();
        if (me.Id && code.trim()) authorize.mutate({ userId: me.Id, code }, { onSuccess: () => setCode('') });
    }, [ authorize, code, me.Id ]);

    return (
        <form className='pf-settings-form' onSubmit={onSubmit}>
            <SettingRow label={t('QuickConnect')} description={isEnabled === false ? t('QuickConnectDisabled') : t('QuickConnectHint')} stacked>
                <div className='pf-inline-form'>
                    <TextField value={code} onChange={setCode} placeholder='123456' label={t('QuickConnectCode')} />
                    <SettingsButton type='submit' variant='primary' disabled={!code.trim() || authorize.isPending || isEnabled === false}>
                        {t('QuickConnectAuthorize')}
                    </SettingsButton>
                </div>
            </SettingRow>
            {authorize.isError && <FormNote tone='error'>{t('QuickConnectError')}</FormNote>}
            {authorize.isSuccess && <FormNote tone='success'>{t('QuickConnectDone')}</FormNote>}
        </form>
    );
};

/** A section in the side list of the window. */
const NavItem: FC<{ section: SettingsSection, isCurrent: boolean }> = ({ section, isCurrent }) => {
    const t = useTranslation();
    const Icon = SECTION_ICONS[section];
    const onClick = useCallback(() => openSettings(section), [ section ]);
    return (
        <button
            type='button'
            className={classNames('pf-settings__nav-item', { 'pf-settings__nav-item--current': isCurrent })}
            aria-current={isCurrent ? 'page' : undefined}
            onClick={onClick}
        >
            <Icon fontSize='inherit' />
            <span>{t(SECTION_LABELS[section])}</span>
        </button>
    );
};

/**
 * Every setting of the user in one window, in the manner of shadcn/ui: the
 * profile first, then playback, subtitles, downloads, interface and devices,
 * in a side list. A change is saved as it is made, with a short "Saved".
 */
const SettingsPanel: FC<{ section: SettingsSection }> = ({ section }) => {
    const t = useTranslation();
    const { data: me } = useMe();
    const saveConfiguration = useSaveConfiguration();
    const { isSaved, flash } = useSavedFlash();
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        panelRef.current?.querySelector<HTMLElement>('.pf-settings__nav-item--current')?.focus();
        const root = document.documentElement;
        const previous = root.style.overflow;
        root.style.overflow = 'hidden';
        return () => {
            root.style.overflow = previous;
        };
    }, []);

    const save = useCallback((change: Partial<UserConfiguration>) => {
        if (me) saveConfiguration.mutate({ me, change }, { onSuccess: flash });
    }, [ flash, me, saveConfiguration ]);

    const onKeyDown = useCallback((event: KeyboardEvent) => {
        // The window handles its own keys: the arrow navigation of the page behind stays out
        event.stopPropagation();
        if (event.key === 'Escape' || event.key === 'GoBack' || event.key === 'BrowserBack') {
            event.preventDefault();
            closeSettings();
        }
    }, []);
    const onBackdrop = useCallback((event: React.MouseEvent) => {
        if (event.target === event.currentTarget) closeSettings();
    }, []);

    let content: React.ReactNode = <div className='pf-settings__loading' aria-busy='true' />;
    if (me) {
        switch (section) {
            case SettingsSection.Profile:
                content = <ProfileSection me={me} />;
                break;
            case SettingsSection.Preferences:
                content = <PreferencesSection />;
                break;
            case SettingsSection.Playback:
                content = <PlaybackSection me={me} save={save} />;
                break;
            case SettingsSection.Subtitles:
                content = <SubtitlesSection me={me} save={save} />;
                break;
            case SettingsSection.Downloads:
                content = <DownloadsSection onSaved={flash} />;
                break;
            case SettingsSection.Interface:
                content = <InterfaceSection />;
                break;
            case SettingsSection.Devices:
                content = <DevicesSection me={me} />;
                break;
        }
    }

    return (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- the backdrop closes on a click; Escape closes from the keyboard
        <div className='pf-settings' onClick={onBackdrop} onKeyDown={onKeyDown}>
            <div ref={panelRef} className='pf-settings__panel' role='dialog' aria-modal='true' aria-labelledby='pf-settings-title'>
                <nav className='pf-settings__nav' aria-label={t('SettingsTitle')}>
                    <h2 id='pf-settings-title' className='pf-settings__title'>{t('SettingsTitle')}</h2>
                    {SETTINGS_SECTIONS.map(item => <NavItem key={item} section={item} isCurrent={item === section} />)}
                </nav>
                <section className='pf-settings__content' aria-labelledby='pf-settings-section'>
                    <header className='pf-settings__header'>
                        <h3 id='pf-settings-section' className='pf-settings__section-title'>{t(SECTION_LABELS[section])}</h3>
                        <span className={classNames('pf-settings__saved', { 'pf-settings__saved--visible': isSaved })} role='status'>
                            {isSaved && (
                                <>
                                    <Check fontSize='inherit' aria-hidden='true' />
                                    {t('SettingsSaved')}
                                </>
                            )}
                        </span>
                        <button type='button' className='pf-settings__close' aria-label={t('SettingsClose')} onClick={closeSettings}>
                            <Close fontSize='inherit' aria-hidden='true' />
                        </button>
                    </header>
                    <div className='pf-settings__body'>{content}</div>
                    {saveConfiguration.isError && <FormNote tone='error'>{t('SettingsSaveError')}</FormNote>}
                </section>
            </div>
        </div>
    );
};

/** Mounts the settings window while it is open, over everything. */
const SettingsModal: FC = () => {
    const section = useOpenSettingsSection();
    return section ? createPortal(<SettingsPanel section={section} />, document.body) : null;
};

export default SettingsModal;
