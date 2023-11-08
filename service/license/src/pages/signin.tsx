import SigninComponent from '@/components/Signin';
import useRouteParamsStore from '@/stores/routeParams';
import useSessionStore from '@/stores/session';
import { ClusterType } from '@/types';
import { compareFirstLanguages } from '@/utils/tools';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function SigninPage() {
  const router = useRouter();
  const { data: routeParams, setRouteParams, clearRouteParams } = useRouteParamsStore();
  const { isUserLogin } = useSessionStore();

  useEffect(() => {
    const { clusterType, external } = router.query;
    console.log(clusterType, external, '--------');
    if (external && clusterType) {
      setRouteParams(external as string, clusterType as ClusterType);
    }
    if (isUserLogin()) {
      router.push('/pricing');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // handle baidu id
  useEffect(() => {
    const { bd_vid } = router.query;
    if (bd_vid) {
      sessionStorage.setItem('bd_vid', bd_vid as string);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <SigninComponent />;
}

export async function getServerSideProps({ req, res, locales }: any) {
  const local =
    req?.cookies?.NEXT_LOCALE || compareFirstLanguages(req?.headers?.['accept-language'] || 'zh');
  res.setHeader('Set-Cookie', `NEXT_LOCALE=zh; Max-Age=2592000; Secure; SameSite=None`);

  const props = {
    ...(await serverSideTranslations(local, undefined, null, locales || []))
  };
  return {
    props
  };
}
