import { useRouter } from 'next/router';
import { useEffect } from 'react';
import useSessionStore from '@/stores/session';
import { OauthProvider } from '@/types/user';
import { useConfigStore } from '@/stores/config';
import useAppStore from '@/stores/app';
import { parseOpenappQuery } from '@/utils/format';
import { gtmLoginStart } from '@/utils/gtm';

export default function OAuth() {
  const router = useRouter();
  const { authConfig } = useConfigStore();
  const { generateState, setProvider, isUserLogin } = useSessionStore();
  const { setAutoLaunch } = useAppStore();

  useEffect(() => {
    if (!router.isReady || !authConfig) return;

    const { login, openapp } = router.query;

    // If user is already logged in, redirect to home page with openapp parameter
    if (isUserLogin()) {
      if (openapp && typeof openapp === 'string') {
        router.replace(`/?openapp=${openapp}`);
      } else {
        router.replace('/');
      }
      return;
    }

    // Handle openapp parameter - store for auto-launch after login
    if (openapp && typeof openapp === 'string') {
      try {
        const { appkey, appQuery, appPath } = parseOpenappQuery(openapp);
        if (appkey) {
          setAutoLaunch(appkey, { raw: appQuery, pathname: appPath });
        }
      } catch (error) {
        console.error('Failed to parse openapp:', error);
      }
    }

    // Auto trigger login based on login parameter
    if (!login || typeof login !== 'string') {
      // If no login parameter, redirect to signin page
      router.replace('/signin');
      return;
    }

    const handleOAuthLogin = async (provider: OauthProvider) => {
      gtmLoginStart();
      const state = generateState();
      setProvider(provider);

      const oauthLogin = async ({ url }: { url: string }) => {
        window.location.href = url;
      };

      const oauthProxyLogin = async ({
        state,
        provider,
        proxyAddress,
        id
      }: {
        state: string;
        proxyAddress: string;
        provider: OauthProvider;
        id: string;
      }) => {
        const target = new URL(proxyAddress);
        const callback = new URL(authConfig.callbackURL);
        target.searchParams.append(
          'oauthProxyState',
          encodeURIComponent(callback.toString()) + '_' + state
        );
        target.searchParams.append('oauthProxyClientID', id);
        target.searchParams.append('oauthProxyProvider', provider);
        router.replace(target.toString());
      };

      try {
        switch (provider) {
          case 'GITHUB': {
            const githubConf = authConfig.idp.github;
            if (!githubConf) {
              throw new Error('GitHub configuration not found');
            }
            if (githubConf.proxyAddress) {
              await oauthProxyLogin({
                provider,
                state,
                proxyAddress: githubConf.proxyAddress,
                id: githubConf.clientID
              });
            } else {
              await oauthLogin({
                url: `https://github.com/login/oauth/authorize?client_id=${githubConf.clientID}&redirect_uri=${authConfig.callbackURL}&scope=user:email%20read:user&state=${state}`
              });
            }
            break;
          }
          case 'GOOGLE': {
            const googleConf = authConfig.idp.google;
            if (!googleConf) {
              throw new Error('Google configuration not found');
            }
            const scope = encodeURIComponent(`profile openid email`);
            if (googleConf.proxyAddress) {
              await oauthProxyLogin({
                state,
                provider,
                proxyAddress: googleConf.proxyAddress,
                id: googleConf.clientID
              });
            } else {
              await oauthLogin({
                url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleConf.clientID}&redirect_uri=${authConfig.callbackURL}&response_type=code&state=${state}&scope=${scope}&include_granted_scopes=true`
              });
            }
            break;
          }
          default: {
            // Unknown provider, redirect to signin
            router.replace('/signin');
            return;
          }
        }
      } catch (error) {
        console.error('OAuth login error:', error);
        router.replace('/signin');
      }
    };

    // Trigger login based on login parameter
    if (login === 'github' && authConfig.idp.github?.enabled) {
      handleOAuthLogin('GITHUB');
    } else if (login === 'google' && authConfig.idp.google?.enabled) {
      handleOAuthLogin('GOOGLE');
    } else {
      // Invalid or unsupported login method, redirect to signin
      router.replace('/signin');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query, authConfig]);

  // Page will redirect immediately, no need to render anything
  return null;
}

export async function getServerSideProps({ req, res, locales }: any) {
  return { props: {} };
}
