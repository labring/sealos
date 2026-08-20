import { PhoneCheckForm } from '@/components/v2/PhoneCheckForm';
import SignLayout from '@/components/v2/SignLayout';
import { ensureLocaleCookie } from '@/utils/ssrLocale';
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
  const local = ensureLocaleCookie({ req, res, defaultLocale: 'en' });

  const queryClient = new QueryClient();
  const props = {
    ...(await serverSideTranslations(local, undefined, null, locales || [])),
    dehydratedState: dehydrate(queryClient)
  };
  return {
    props
  };
}
