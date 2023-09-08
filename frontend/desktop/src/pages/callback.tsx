import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import request from '@/services/request';
import useSessionStore from '@/stores/session';
import { Session } from '@/types';
import { Flex, Spinner } from '@chakra-ui/react';
const Callback: NextPage = () => {
  const router = useRouter();
  const setSessionProp = useSessionStore((s) => s.setSessionProp);
  const setProvider = useSessionStore((s) => s.setProvider);
  const provider = useSessionStore((s) => s.provider);
  const compareState = useSessionStore((s) => s.compareState);
  useEffect(() => {
    if (!router.isReady) return;
    if (!provider) return;

    (async () => {
      try {
        let data: { data: Session; code: number };
        let code = '';
        let state = '';
        if (['github', 'wechat', 'google'].includes(provider)) {
          code = router.query.code as string;
          state = router.query.state as string;
          // } else if ('google') {
          //   const locationMap = new Map<string, string>(window.location.hash.substring(1).split('&').map(kv => kv.split('=', 2) as [string, string]))
          //   console.log(locationMap)
          //   code = locationMap.get('access_token') ?? ''
          //   state = locationMap.get('state') ?? ''
        } else {
          throw new Error('provider error');
        }
        if (!code || !state) throw new Error();
        if (!compareState(state as string)) throw new Error();
        data = await request.post<any, { data: Session; code: number }>(
          '/api/auth/oauth/' + provider,
          { code }
        );
        setProvider();
        if (data.code === 200) {
          const { token, user, kubeconfig } = data.data;
          setSessionProp('token', token);
          setSessionProp('user', user);
          setSessionProp('kubeconfig', kubeconfig);

          router.replace('/');
        } else {
          throw new Error();
        }
      } catch (error) {
        router.replace('/signin');
      }
    })();
  }, [router]);
  return (
    <Flex w={'full'} h={'full'} justify={'center'} align={'center'}>
      <Spinner size="xl" />
    </Flex>
  );
};
export default Callback;
