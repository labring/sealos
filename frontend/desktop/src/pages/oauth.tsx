import { useRouter } from 'next/router';
import { useEffect } from 'react';
import useSessionStore from '@/stores/session';
import { OauthProvider } from '@/types/user';
import { useConfigStore } from '@/stores/config';
import useAppStore from '@/stores/app';
import { parseOpenappQuery } from '@/utils/format';
import { gtmLoginStart } from '@/utils/gtm';
import { ensureLocaleCookie } from '@/utils/ssrLocale';
import { createTemplateInstance } from '@/api/platform';
import { getRegionToken } from '@/api/auth';
import { nsListRequest, switchRequest } from '@/api/namespace';
import { sessionConfig } from '@/utils/sessionConfig';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';
import { AccessTokenPayload } from '@/types/token';
import { jwtDecode } from 'jwt-decode';
import { isString } from 'lodash';
import { useMutation } from '@tanstack/react-query';

export default function OAuth() {
  const router = useRouter();
  const { authConfig } = useConfigStore();
  const { generateState, setProvider, isUserLogin, setToken, delSession, session } =
    useSessionStore();
  const { setAutoLaunch, setAutoDeployTemplate } = useAppStore();
  const { lastWorkSpaceId } = useSessionStore();

  const switchWorkspaceMutation = useMutation({
    mutationFn: switchRequest,
    async onSuccess(data) {
      if (data.code === 200 && !!data.data && session) {
        const payload = jwtDecode<AccessTokenPayload>(data.data.token);
        await sessionConfig({
          ...data.data,
          kubeconfig: switchKubeconfigNamespace(session.kubeconfig, payload.workspaceId)
        });
      } else {
        throw Error('session is invalid');
      }
    }
  });

  useEffect(() => {
    if (!router.isReady || !authConfig) return;

    const { token, login, openapp, templateName, templateForm, workspaceUid } = router.query;

    const handleTokenLogin = async () => {
      try {
        const globalToken = token as string;
        if (!isString(globalToken)) throw new Error('Invalid token');

        delSession();
        setToken('');
        setToken(globalToken);

        const regionTokenRes = await getRegionToken();
        if (!regionTokenRes?.data) {
          throw new Error('Failed to get region token');
        }

        await sessionConfig(regionTokenRes.data);

        const currentSession = useSessionStore.getState().session;
        if (currentSession?.token && currentSession?.user?.ns_uid) {
          const nsList = await nsListRequest();
          const namespaces = nsList?.data?.namespaces || [];

          let targetWorkspaceUid = workspaceUid as string | undefined;
          if (!targetWorkspaceUid && lastWorkSpaceId) {
            targetWorkspaceUid = lastWorkSpaceId;
          }

          const existNamespace = namespaces.find((x) => x.uid === targetWorkspaceUid);
          if (existNamespace && existNamespace.uid !== currentSession.user.ns_uid) {
            await switchWorkspaceMutation.mutateAsync(existNamespace.uid);
          }
        }

        await handleTemplateDeployment();

        if (openapp && typeof openapp === 'string') {
          const { appkey, appQuery, appPath } = parseOpenappQuery(openapp);
          if (appkey) {
            setAutoLaunch(appkey, { raw: appQuery, pathname: appPath });
          }
        }

        await router.replace('/');
      } catch (error) {
        console.error('Token login error:', error);
        setToken('');
        await router.replace('/signin');
      }
    };

    const handleTemplateDeployment = async () => {
      if (templateName && typeof templateName === 'string') {
        let parsedTemplateForm: Record<string, any> | undefined;
        if (templateForm) {
          try {
            parsedTemplateForm =
              typeof templateForm === 'string' ? JSON.parse(templateForm) : templateForm;
          } catch (error) {
            console.error('Failed to parse templateForm:', error);
            return;
          }
        }

        if (parsedTemplateForm) {
          try {
            await createTemplateInstance({
              templateName,
              templateForm: parsedTemplateForm
            });
            console.log('Template instance created successfully');
          } catch (error) {
            console.error('Failed to create template instance:', error);
          }
        }
      }
    };

    const handleSaveParams = () => {
      if (templateName && typeof templateName === 'string') {
        let parsedTemplateForm: Record<string, any> | undefined;
        if (templateForm) {
          try {
            parsedTemplateForm =
              typeof templateForm === 'string' ? JSON.parse(templateForm) : templateForm;
          } catch (error) {
            console.error('Failed to parse templateForm:', error);
          }
        }
        if (parsedTemplateForm) {
          setAutoDeployTemplate(templateName, parsedTemplateForm);
        }
      }

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
    };

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
            router.replace('/signin');
            return;
          }
        }
      } catch (error) {
        console.error('OAuth login error:', error);
        router.replace('/signin');
      }
    };

    if (token && typeof token === 'string') {
      handleTokenLogin();
      return;
    }

    if (isUserLogin()) {
      (async () => {
        try {
          await handleTemplateDeployment();
        } catch (error) {
          console.error('Template deployment error:', error);
        } finally {
          if (openapp && typeof openapp === 'string') {
            router.replace(`/?openapp=${openapp}`);
          } else {
            router.replace('/');
          }
        }
      })();
      return;
    }

    handleSaveParams();

    if (!login || typeof login !== 'string') {
      router.replace('/signin');
      return;
    }

    if (login === 'github' && authConfig.idp.github?.enabled) {
      handleOAuthLogin('GITHUB');
    } else if (login === 'google' && authConfig.idp.google?.enabled) {
      handleOAuthLogin('GOOGLE');
    } else {
      router.replace('/signin');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query, authConfig]);

  // Page will redirect immediately, no need to render anything
  return null;
}

export async function getServerSideProps({ req, res, locales }: any) {
  ensureLocaleCookie({ req, res, defaultLocale: 'en' });
  return { props: {} };
}
