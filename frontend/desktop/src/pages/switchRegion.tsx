import { getRegionToken } from '@/api/auth';
import { nsListRequest, switchRequest } from '@/api/namespace';
import useAppStore from '@/stores/app';
import useSessionStore from '@/stores/session';
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
  const { lastWorkSpaceId } = useSessionStore();
  const { setAutoLaunch } = useAppStore();

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
    const { query } = router;
    const { appkey, appQuery } = parseOpenappQuery((query?.openapp as string) || '');
    let workspaceUid: string | undefined;
    if (isString(query?.workspaceUid)) workspaceUid = query.workspaceUid;
    if (appkey && typeof appQuery === 'string') {
      setAutoLaunch(appkey, { raw: appQuery }, workspaceUid);
    }
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
