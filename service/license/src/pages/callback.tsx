import { uploadConvertData } from '@/api/system';
import { signInByProvider } from '@/api/user';
import useSessionStore from '@/stores/session';
import { Flex, Spinner } from '@chakra-ui/react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const Callback: NextPage = () => {
  const router = useRouter();
  const { provider, setSession, compareState } = useSessionStore();

  useEffect(() => {
    if (!router.isReady) return;

    (async () => {
      try {
        if (!provider || !['github', 'wechat', 'google'].includes(provider)) {
          throw new Error('provider error');
        }

        const { code, state } = router.query;

        if (!code || !state || !compareState(state as string)) {
          throw new Error('failed to get code and state');
        }

        const data = await signInByProvider(provider, code);
        setSession(data);
        uploadConvertData([3])
          .then((res) => {
            console.log(res);
          })
          .catch((err) => {
            console.log(err);
          });
        router.replace('/pricing');
      } catch (error) {
        router.replace('/signin');
      }
    })();
  }, [compareState, provider, router, setSession]);

  return (
    <Flex w={'full'} h={'full'} justify={'center'} align={'center'}>
      <Spinner size="xl" />
    </Flex>
  );
};
export default Callback;
