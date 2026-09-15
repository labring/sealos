import { PhoneCheckForm } from '@/components/v2/PhoneCheckForm';
import SignLayout from '@/components/v2/SignLayout';
import { getLocaleCookieHeader, getPlatformDefaultLocale, getRequestLocale } from '@/utils/locale';
import { getLayoutConfig } from './api/platform/getLayoutConfig';
import { dehydrate, QueryClient } from '@tanstack/react-query';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function PersonalInfoPage() {
  return (
    <SignLayout>
      <PhoneCheckForm />
    </SignLayout>
  );
}
export async function getServerSideProps({ req, res, locales }: any) {
  const layoutConfig = await getLayoutConfig();
  const local = getRequestLocale(
    req?.cookies?.NEXT_LOCALE,
    getPlatformDefaultLocale(layoutConfig.version)
  );
  res.setHeader('Set-Cookie', getLocaleCookieHeader(local));

  const queryClient = new QueryClient();
  const props = {
    ...(await serverSideTranslations(local, undefined, null, locales || [])),
    dehydratedState: dehydrate(queryClient)
  };
  return {
    props
  };
}
