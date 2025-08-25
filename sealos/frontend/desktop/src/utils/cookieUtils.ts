import Cookies, { CookieAttributes } from 'js-cookie';

export const setCookie = (key: string, value: string, options?: CookieAttributes) => {
  Cookies.set(key, value, options);
};

export const getCookie = (key: string) => {
  return Cookies.get(key);
};

export const removeCookie = (key: string) => {
  Cookies.remove(key);
};
