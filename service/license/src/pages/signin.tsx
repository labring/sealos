import SigninComponent from '@/components/signin';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function SigninPage() {
  return <SigninComponent />;
}

export async function getServerSideProps({ req, res, locales }: any) {
  const lang: string = req?.headers?.['accept-language'] || 'zh';
  const local = lang.indexOf('zh') !== -1 ? 'zh' : 'en';

  const props = {
    ...(await serverSideTranslations(local, undefined, null, locales || []))
  };
  return {
    props
  };
}
