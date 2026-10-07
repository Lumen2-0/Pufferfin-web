/** The three groups of upstream form pages served in the Pufferfin style. */
export enum FormSkinKind {
    /** Account and user settings: under the Pufferfin bar, dense form grammar. */
    Settings = 'settings',
    /** Sign in, server selection, password recovery: no user yet, so no bar. */
    Public = 'public',
    /** First run wizard: no user yet either, so no bar. */
    Wizard = 'wizard'
}

/** Account and user settings pages, as the upstream route tables name them. */
export const SETTINGS_PATHS = [
    'userprofile',
    'mypreferencesmenu',
    'mypreferencesdisplay',
    'mypreferenceshome',
    'mypreferencescontrols',
    'mypreferencesplayback',
    'mypreferencessubtitles',
    'quickconnect'
];

/** Pages reachable without a user, as the upstream route tables name them. */
export const PUBLIC_PATHS = [
    'login',
    'selectserver',
    'addserver',
    'forgotpassword',
    'forgotpasswordpin'
];

/** Root of the first run wizard. */
export const WIZARD_PATH = 'wizard';

/** Steps of the first run wizard, under `WIZARD_PATH`. */
export const WIZARD_STEPS = [
    'start',
    'user',
    'library',
    'settings',
    'remoteaccess',
    'finish'
];

const KIND_BY_PATHNAME = new Map<string, FormSkinKind>([
    ...SETTINGS_PATHS.map(path => [ `/${path}`, FormSkinKind.Settings ] as const),
    ...PUBLIC_PATHS.map(path => [ `/${path}`, FormSkinKind.Public ] as const),
    // The wizard root only redirects to its first step
    [ `/${WIZARD_PATH}`, FormSkinKind.Wizard ],
    ...WIZARD_STEPS.map(step => [ `/${WIZARD_PATH}/${step}`, FormSkinKind.Wizard ] as const)
]);

/**
 * Which Pufferfin form skin an upstream page gets, if any. The page logic,
 * its fields and its settings stay upstream; only its look is Pufferfin.
 */
export const getFormSkinKind = (pathname: string): FormSkinKind | undefined =>
    KIND_BY_PATHNAME.get(pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname);
