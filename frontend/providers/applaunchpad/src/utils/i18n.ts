import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export const serviceSideProps = (content: any) => {
  return serverSideTranslations(
    content.req.cookies.NEXT_LOCALE || 'en',
    undefined,
    null,
    content.locales
  );
};
