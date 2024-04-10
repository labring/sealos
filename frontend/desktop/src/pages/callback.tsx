import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import request from '@/services/request';
import useSessionStore from '@/stores/session';
import { ApiResp } from '@/types';
import { Flex, Spinner } from '@chakra-ui/react';
import { uploadConvertData } from '@/api/platform';
import { jwtDecode } from 'jwt-decode';
import { isString } from 'lodash';
import { getRegionToken, UserInfo } from '@/api/auth';
import { AccessTokenPayload } from '@/types/token';
import { getInviterId, sessionConfig } from '@/utils/sessionConfig';

const Callback: NextPage = () => {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);
  const setProvider = useSessionStore((s) => s.setProvider);
  const setToken = useSessionStore((s) => s.setToken);
  const provider = useSessionStore((s) => s.provider);
  const compareState = useSessionStore((s) => s.compareState);
  useEffect(() => {
    if (!router.isReady) return;
    let isProxy: boolean = false;
    (async () => {
      try {
        if (!provider || !['github', 'wechat', 'google', 'oauth2'].includes(provider))
          throw new Error('provider error');
        const { code, state } = router.query;
        if (!isString(code) || !isString(state)) throw new Error('failed to get code and state');
        console.log(encodeURIComponent(state), code, state);
        if (!compareState(state)) throw new Error('invalid state');
        // proxy oauth2.0
        const _url = state;
        await new Promise<URL>((resolve, reject) => {
          resolve(new URL(_url));
        })
          .then(async (url) => {
            const result = (await (
              await fetch(`/api/auth/canProxy?domain=${url.host}`)
            ).json()) as ApiResp<{ containDomain: boolean }>;
            isProxy = true;
            if (result.data?.containDomain) {
              url.searchParams.append('code', code);
              console.log(url);
              await router.replace(url.toString());
            }
          })
          .catch(() => {
            Promise.resolve();
          });
        if (isProxy) {
          // prevent once token
          setProvider();
          isProxy = false;
          return;
        }

        const data = await request.post<
          any,
          ApiResp<{
            token: string;
            realUser: {
              realUserUid: string;
            };
          }>
        >('/api/auth/oauth/' + provider, { code, inviterId: getInviterId() });
        setProvider();
        if (data.code === 200 && data.data?.token) {
          const token = data.data?.token;
          setToken(token);
          const regionTokenRes = await getRegionToken();
          if (regionTokenRes?.data) {
            await sessionConfig(regionTokenRes.data);
            uploadConvertData([3]).then(
              (res) => {
                console.log(res);
              },
              (err) => {
                console.log(err);
              }
            );
            await router.replace('/');
          }
        } else {
          throw new Error();
        }
      } catch (error) {
        console.error(error);
        await router.replace('/signin');
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
