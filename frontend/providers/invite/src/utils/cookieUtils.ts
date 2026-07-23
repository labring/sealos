import Cookies from 'js-cookie';

export const LANG_KEY = 'NEXT_LOCALE';

export const setLangStore = (value: string) => {
  return Cookies.set(LANG_KEY, value, { expires: 30, sameSite: 'None', secure: true });
};

export const getLangStore = () => {
  return Cookies.get(LANG_KEY);
};

export const removeLangStore = () => {
  Cookies.remove(LANG_KEY);
};
