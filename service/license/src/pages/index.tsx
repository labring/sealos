import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function IndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.push('/signin');
  }, []);

  return <div></div>;
}

export async function getServerSideProps({ req, res, locales }: any) {
  const lang: string = req?.headers?.['accept-language'] || 'zh';
  const local = lang.indexOf('zh') !== -1 ? 'zh' : 'en';

  return {
    props: {
      ...(await serverSideTranslations(local, undefined, null, locales || []))
    }
  };
}
