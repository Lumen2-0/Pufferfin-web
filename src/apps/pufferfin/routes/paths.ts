/** Root path of the Pufferfin interface. */
export const PUFFERFIN_APP_PATH = 'pufferfin';

export const isPufferfinPath = (pathname: string) =>
    pathname === `/${PUFFERFIN_APP_PATH}` || pathname.startsWith(`/${PUFFERFIN_APP_PATH}/`);
