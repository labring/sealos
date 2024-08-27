import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import useSessionStore from '@/stores/session';
import { Flex, Spinner } from '@chakra-ui/react';
import { getRegionToken } from '@/api/auth';
import { isString } from 'lodash';
import { jwtDecode } from 'jwt-decode';
import { AccessTokenPayload } from '@/types/token';
import { sessionConfig } from '@/utils/sessionConfig';
import { useMutation } from '@tanstack/react-query';
import { nsListRequest, switchRequest } from '@/api/namespace';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';

const Callback: NextPage = () => {
  const router = useRouter();
  const setToken = useSessionStore((s) => s.setToken);
  const delSession = useSessionStore((s) => s.delSession);
  const { token: curToken, session } = useSessionStore((s) => s);
  const { lastWorkSpaceId } = useSessionStore();

  const mutation = useMutation({
    mutationFn: switchRequest,
    async onSuccess(data) {
      if (data.code === 200 && !!data.data && session) {
        const payload = jwtDecode<AccessTokenPayload>(data.data.token);
        await sessionConfig({
          ...data.data,
          kubeconfig: switchKubeconfigNamespace(session.kubeconfig, payload.workspaceId)
        });
      } else {
        throw Error('session in invalid');
      }
    }
  });

  useEffect(() => {
    if (!router.isReady) return;
    (async () => {
      try {
        if (!!curToken) {
          delSession();
          setToken('');
        }
        const globalToken = router.query.token;
        if (!isString(globalToken)) throw new Error('failed to get globalToken');
        setToken(globalToken);
        const regionTokenRes = await getRegionToken();
        if (regionTokenRes?.data) {
          await sessionConfig(regionTokenRes.data);
          const session = useSessionStore.getState().session;
          if (session?.token && session?.user?.ns_uid) {
            const nsList = await nsListRequest();
            const namespaces = nsList?.data?.namespaces || [];
            const existNamespace = namespaces.find((x) => x.uid === lastWorkSpaceId);
            if (existNamespace && existNamespace.uid !== session.user.ns_uid) {
              await mutation.mutateAsync(existNamespace.uid);
            }
          }
          await router.replace('/');
          return;
        } else {
          throw new Error();
        }
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
