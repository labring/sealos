import { useRouter } from 'next/router';
import { useEffect } from 'react';
import request from '@/services/request';
import useSessionStore from '@/stores/session';
import { ApiResp, AppClientConfigType, AuthConfigType } from '@/types';
import { Flex, Spinner } from '@chakra-ui/react';
import { isString } from 'lodash';
import { useQuery } from '@tanstack/react-query';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { compareFirstLanguages } from '@/utils/tools';
import { OauthProvider } from '@/types/user';
import { useConfigStore } from '@/stores/config';
import { getAppConfig } from './api/platform/getAppConfig';

export default function Callback({ appConfig }: { appConfig: AppClientConfigType }) {
  const router = useRouter();
  const setProvider = useSessionStore((s) => s.setProvider);
  const generateState = useSessionStore((s) => s.generateState);
  const callback_url = appConfig.desktop.auth.callbackURL;
  useEffect(() => {
    if (!router.isReady) return;
    const oauthLogin = async ({ url, provider }: { url: string; provider?: OauthProvider }) => {
      setProvider(provider);
      window.location.href = url;
    };
    const oauthProxyState = router.query.oauthProxyState;
    const oauthProvider = router.query.oauthProxyProvider;
    let isProxying = false;
    // nextjs auto decode
    let oauthClientId = router.query.oauthProxyClientID;
    if (!isString(oauthProxyState) || !isString(oauthProvider) || !isString(oauthClientId)) return;

    (async () => {
      try {
        if (isProxying) return;
        isProxying = true;
        const [originUrl, ...res] = oauthProxyState.split('_');
        const _url = new URL(decodeURIComponent(originUrl));
        const result = (await (
          await fetch(`/api/auth/canProxy?domain=${encodeURIComponent(_url.host)}`, {})
        ).json()) as ApiResp<{ containDomain: boolean }>;
        if (!result.data?.containDomain) return;
        const state = encodeURIComponent(generateState('PROXY', oauthProxyState));

        if (oauthProvider === 'GITHUB') {
          await oauthLogin({
            provider: 'GITHUB',
            url: `https://github.com/login/oauth/authorize?client_id=${oauthClientId}&redirect_uri=${callback_url}&scope=user:email%20read:user&state=${state}`
          });
        } else if (oauthProvider === 'WECHAT') {
          await oauthLogin({
            provider: 'WECHAT',
            url: `https://open.weixin.qq.com/connect/qrconnect?appid=${oauthClientId}&redirect_uri=${callback_url}&response_type=code&state=${state}&scope=snsapi_login&#wechat_redirect`
          });
        } else if (oauthProvider === 'GOOGLE') {
          const scope = encodeURIComponent(
            `https://www.googleapis.com/auth/userinfo.profile openid`
          );
          oauthLogin({
            provider: 'GOOGLE',
            url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${oauthClientId}&redirect_uri=${callback_url}&response_type=code&state=${state}&scope=${scope}&include_granted_scopes=true`
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        isProxying = false;
      }
    })();
    return () => {
      isProxying = true;
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
  const appConfig = await getAppConfig();
  return {
    props: {
      ...(await serverSideTranslations(local, undefined, null, locales || [])),
      sealos_cloud_domain,
      appConfig
    }
  };
}
