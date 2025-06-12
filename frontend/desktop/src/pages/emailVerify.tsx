import { getRegionToken, initRegionToken } from '@/api/auth';
import { nsListRequest, switchRequest } from '@/api/namespace';
import { SwitchRegionType } from '@/constants/account';
import request from '@/services/request';
import useAppStore from '@/stores/app';
import { useConfigStore } from '@/stores/config';
import { useInitWorkspaceStore } from '@/stores/initWorkspace';
import useSessionStore from '@/stores/session';
import { ApiResp } from '@/types';
import { AccessTokenPayload } from '@/types/token';
import { parseOpenappQuery } from '@/utils/format';
import { sessionConfig } from '@/utils/sessionConfig';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';
import { Flex, Spinner } from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import { jwtDecode } from 'jwt-decode';
import { isString } from 'lodash';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const Callback: NextPage = () => {
  const router = useRouter();
  const setToken = useSessionStore((s) => s.setToken);
  const delSession = useSessionStore((s) => s.delSession);
  const { token: curToken, session } = useSessionStore((s) => s);
  // const { cloudConfig } = useConfigStore();
  // const { lastWorkSpaceId } = useSessionStore();
  // const { setAutoLaunch } = useAppStore();
  const verifyEmailMutation = useMutation({
    mutationFn: async (token: string) => {
      if (!isString(token)) throw new Error('failed to get token');
      const resp = await request.post<never, ApiResp<{ token: string; needInit: boolean }>>(
        '/api/auth/email/signUp/verify',
        { token }
      );
      if (resp.code !== 200) throw new Error('failed to verify email');
      return resp.data;
    }
  });
  useEffect(() => {
    if (!router.isReady) return;
    const verifyToken = router.query.token;
    if (!isString(verifyToken)) throw new Error('failed to get Token');
    console.log(router.query);
    (async () => {
      try {
        if (!!curToken) {
          delSession();
          setToken('');
        }
        // setToken(globalToken);
        // await router.replace('/workspace');
        const data = await verifyEmailMutation.mutateAsync(verifyToken);
        if (!data || !data?.token) {
          throw new Error('No result data');
        }
        const token = data?.token;
        setToken(token);
        const needInit = data.needInit;
        console.log('needInit', needInit);
        if (needInit) {
          // await router.push('/personalinfo');
          await router.push('/unlockcard');
          return;
        }
        await router.replace('/signin');
        return;
      } catch (error) {
        console.error(error);
        setToken('');
        await router.replace('/signin');
        return;
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
