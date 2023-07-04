import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect} from 'react';
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
  const updateUser = useSessionStore((s) => s.updateUser);
  useEffect(() => {
    if (!router.isReady) return;
    const { code, state } = router.query;
    if (!compareState(state as string)) return;
    if (!code || !provider) return;

    (async () => {
      try {
        let data: { data: Session, code: number }
        switch (provider) {
          case 'github':
            data = (await request.post<any, { data: Session, code: number }>('/api/auth/oauth/github', { code }))
            break;
          case 'wechat':
            data = (await request.post<any, { data: Session, code: number }>('/api/auth/oauth/wechat', { code }))
            break;
          default:
            throw Error('provider error')
            break;
        }
        if (data.code === 200) {
          const { token, user, kubeconfig } = data.data;
          setSessionProp('token', token);
          setSessionProp('user', user);
          setSessionProp('kubeconfig', kubeconfig);
          updateUser()
        }
      } finally {
        provider && setProvider()
        router.replace('/')
      }

    })()
  }, [router]);
  return <Flex w={'full'} h={'full'} justify={'center'} align={'center'}>
    <Spinner size='xl' />
  </Flex>;
};
export default Callback;