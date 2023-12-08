import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import useSessionStore from '@/stores/session';
import { Flex, Spinner } from '@chakra-ui/react';
import { uploadConvertData } from '@/api/platform';
import { getRegionToken, UserInfo } from '@/api/auth';
import { isString } from 'lodash';
import { jwtDecode } from 'jwt-decode';
import { AccessTokenPayload } from '@/types/token';

const Callback: NextPage = () => {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);
  const setToken = useSessionStore((s) => s.setToken);
  const delSession = useSessionStore((s) => s.delSession);
  const curToken = useSessionStore((s) => s.token);
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
          const regionUserToken = regionTokenRes.data.token;
          setToken(regionUserToken);
          const infoData = await UserInfo();
          const payload = jwtDecode<AccessTokenPayload>(regionUserToken);
          setSession({
            token: regionUserToken,
            user: {
              k8s_username: payload.userCrName,
              name: infoData.data?.info.nickname || '',
              avatar: infoData.data?.info.avatarUri || '',
              nsid: payload.workspaceId,
              ns_uid: payload.workspaceUid,
              userCrUid: payload.userCrUid,
              userId: payload.userId,
              userUid: payload.userUid
            },
            kubeconfig: regionTokenRes.data.kubeconfig
          });
          uploadConvertData([3]).then(
            (res) => {
              console.log(res);
            },
            (err) => {
              console.log(err);
            }
          );
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
