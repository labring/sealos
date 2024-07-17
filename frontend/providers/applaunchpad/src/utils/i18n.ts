import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { LANG_KEY } from './cookieUtils';
import { I18nNsType } from '@/types/i18next';

export const serviceSideProps = (content: any, ns: I18nNsType = []) => {
  return serverSideTranslations(
    content.req.cookies[LANG_KEY] || 'zh',
    ['common', ...ns],
    null,
    content.locales
  );
};
