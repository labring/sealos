import { useRouter } from 'next/router';
import { useEffect } from 'react';
import request from '@/services/request';
import useSessionStore from '@/stores/session';
import { ApiResp, AuthConfigType } from '@/types';
import { Flex, Spinner } from '@chakra-ui/react';
import { isString } from 'lodash';
import { useQuery } from '@tanstack/react-query';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { compareFirstLanguages } from '@/utils/tools';
import { OauthProvider } from '@/types/user';
import { useConfigStore } from '@/stores/config';

export default function Callback() {
  const router = useRouter();
  const setProvider = useSessionStore((s) => s.setProvider);
  const generateState = useSessionStore((s) => s.generateState);
  const { data: res } = useQuery(['getPlatformEnv'], () =>
    request<any, ApiResp<AuthConfigType>>('/api/platform/getLoginConfig')
  );
  const conf = res?.data;
  const callback_url = conf?.callbackURL;
  const oauthLogin = async ({ url, provider }: { url: string; provider?: OauthProvider }) => {
    setProvider(provider);
    window.location.href = url;
  };
  useEffect(() => {
    // if (router.isReady) return
    console.log('hellow proxy');
    const oauthProxyState = router.query.oauthProxyState;
    const oauthProvider = router.query.oauthProxyProvider;
    // nextjs auto decode
    let oauthClientId = router.query.oauthProxyClientID;
    if (!isString(oauthProxyState) || !isString(oauthProvider) || !isString(oauthClientId)) return;

    console.log(oauthProvider, oauthProxyState, oauthClientId, callback_url);
    (async () => {
      try {
        const _url = new URL(oauthProxyState);
        const result = (await (
          await fetch(`/api/auth/canProxy?domain=${encodeURIComponent(_url.host)}`, {})
        ).json()) as ApiResp<{ containDomain: boolean }>;
        console.log(result);
        if (!result.data?.containDomain) return;
        const state = generateState(oauthProxyState);

        if (oauthProvider === 'github') {
          await oauthLogin({
            provider: 'github',
            url: `https://github.com/login/oauth/authorize?client_id=${oauthClientId}&redirect_uri=${callback_url}&scope=user:email%20read:user&state=${state}`
          });
        } else if (oauthProvider === 'wechat') {
          await oauthLogin({
            provider: 'wechat',
            url: `https://open.weixin.qq.com/connect/qrconnect?appid=${oauthClientId}&redirect_uri=${callback_url}&response_type=code&state=${state}&scope=snsapi_login&#wechat_redirect`
          });
        } else if (oauthProvider === 'google') {
          const scope = encodeURIComponent(
            `https://www.googleapis.com/auth/userinfo.profile openid`
          );
          oauthLogin({
            provider: 'google',
            url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${oauthClientId}&redirect_uri=${callback_url}&response_type=code&state=${state}&scope=${scope}&include_granted_scopes=true`
          });
        }
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      // abortController.abort()
    };
  }, [router, callback_url]);
  return (
    <Flex w={'full'} h={'full'} justify={'center'} align={'center'}>
      <Spinner size="xl" />
    </Flex>
  );
}

export async function getServerSideProps({ req, res, locales }: any) {
  const local =
    req?.cookies?.NEXT_LOCALE || compareFirstLanguages(req?.headers?.['accept-language'] || 'zh');
  res.setHeader('Set-Cookie', `NEXT_LOCALE=${local}; Max-Age=2592000; Secure; SameSite=None`);
  const sealos_cloud_domain = useConfigStore.getState().cloudConfig?.domain;
  return {
    props: {
      ...(await serverSideTranslations(local, undefined, null, locales || [])),
      sealos_cloud_domain
    }
  };
}
