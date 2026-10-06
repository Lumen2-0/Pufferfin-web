/** Root path of the Pufferfin interface. */
export const PUFFERFIN_APP_PATH = 'pufferfin';

export const isPufferfinPath = (pathname: string) =>
    pathname === `/${PUFFERFIN_APP_PATH}` || pathname.startsWith(`/${PUFFERFIN_APP_PATH}/`);

/** Detail page of a movie or a series. */
export const getItemPath = (itemId: string) => `/${PUFFERFIN_APP_PATH}/item/${itemId}`;

/** Universal search. */
export const getSearchPath = () => `/${PUFFERFIN_APP_PATH}/search`;

/** Person page: portrait, biography and filmography. */
export const getPersonPath = (personId: string) => `/${PUFFERFIN_APP_PATH}/person/${personId}`;
