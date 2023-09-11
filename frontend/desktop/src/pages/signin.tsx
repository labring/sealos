import SigninComponent from '@/components/signin';
import useSessionStore from '@/stores/session';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function SigninPage() {
  return <SigninComponent />;
}

export async function getServerSideProps({ req, res, locales }: any) {
  const local = req?.cookies?.NEXT_LOCALE || 'en';

  const props = {
    ...(await serverSideTranslations(local, undefined, null, locales || []))
  };
  return {
    props
  };
}
