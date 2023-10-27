import SigninComponent from '@/components/signin';
import { compareFirstLanguages } from '@/utils/tools';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function SigninPage() {
  return <SigninComponent />;
}

export async function getServerSideProps({ req, res, locales }: any) {
  const local =
    req?.cookies?.NEXT_LOCALE || compareFirstLanguages(req?.headers?.['accept-language'] || 'zh');
  res.setHeader('Set-Cookie', `NEXT_LOCALE=${local}; Max-Age=2592000; Secure; SameSite=None`);

  const props = {
    ...(await serverSideTranslations(local, undefined, null, locales || []))
  };
  return {
    props
  };
}
