import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { LANG_KEY } from './cookieUtils';
import { t } from 'i18next';

export const serviceSideProps = (content: any) => {
  return serverSideTranslations(
    content.req.cookies[LANG_KEY] || 'zh',
    undefined,
    null,
    content.locales
  );
};

export type keyword = Exclude<
  Parameters<typeof t>[0],
  string | TemplateStringsArray | string[]
>[number];

export function assembleTranslate(key: Array<keyword>, language: string) {
  return key.map((item) => t(item)).join(language === 'en' ? ' ' : '');
}
