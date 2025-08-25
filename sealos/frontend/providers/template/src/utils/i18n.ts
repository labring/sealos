import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { LANG_KEY } from './cookieUtils';

export const serviceSideProps = (content: any) => {
  return serverSideTranslations(
    content.req.cookies[LANG_KEY] || 'zh',
    undefined,
    null,
    content.locales
  );
};
