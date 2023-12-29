import { getSystemEnv } from '@/api/platform';
import SigninComponent from '@/components/signin';
import { compareFirstLanguages } from '@/utils/tools';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function SigninPage() {
  return <SigninComponent />;
}

export async function getServerSideProps({ req, res, locales }: any) {
  const local =
    req?.cookies?.NEXT_LOCALE || compareFirstLanguages(req?.headers?.['accept-language'] || 'zh');
  res.setHeader('Set-Cookie', `NEXT_LOCALE=${local}; Max-Age=2592000; Secure; SameSite=None`);

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({ queryKey: ['getPlatformEnv'], queryFn: getSystemEnv });
  const props = {
    ...(await serverSideTranslations(local, undefined, null, locales || [])),
    dehydratedState: dehydrate(queryClient)
  };
  return {
    props
  };
}
