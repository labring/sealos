import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import useSessionStore from '@/stores/session';
import { OauthProvider } from '@/types/user';
import { useConfigStore } from '@/stores/config';
import useAppStore from '@/stores/app';
import { useGuideModalStore } from '@/stores/guideModal';
import { parseOpenappQuery } from '@/utils/format';
import { gtmLoginStart } from '@/utils/gtm';
import { ensureLocaleCookie } from '@/utils/ssrLocale';
import { createTemplateInstance } from '@/api/platform';
import { getRegionToken, initRegionToken } from '@/api/auth';
import { nsListRequest, switchRequest } from '@/api/namespace';
import { SwitchRegionType } from '@/constants/account';
import { sessionConfig } from '@/utils/sessionConfig';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';
import { AccessTokenPayload } from '@/types/token';
import { jwtDecode } from 'jwt-decode';
import { isString } from 'lodash';
import { useMutation } from '@tanstack/react-query';
import { useCustomToast } from '@/hooks/useCustomToast';

export default function OAuth() {
  const router = useRouter();
  const { authConfig } = useConfigStore();
  const { generateState, setProvider, isUserLogin, setGlobalToken, delSession, session } =
    useSessionStore();
  const { setAutoLaunch, setAutoDeployTemplate, cancelAutoDeployTemplate } = useAppStore();
  const { lastWorkSpaceId } = useSessionStore();
  const { setInitGuide } = useGuideModalStore();
  const hasProcessedRef = useRef(false);
  const { toast } = useCustomToast();

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

  const initMutation = useMutation({
    mutationFn(data: { workspaceName: string }) {
      return initRegionToken(data);
    },
    onSuccess(data) {
      setInitGuide(true);
    }
  });

  useEffect(() => {
    if (!router.isReady || !authConfig) return;

    // Prevent multiple executions
    if (hasProcessedRef.current) {
      return;
    }

    const {
      token,
      login,
      openapp,
      templateName,
      templateForm,
      workspaceUid,
      switchRegionType,
      workspaceName
    } = router.query;

    const handleTokenLogin = async () => {
      hasProcessedRef.current = true;

      try {
        const globalToken = token as string;
        if (!isString(globalToken)) throw new Error('Invalid token');

        delSession();
        setGlobalToken(globalToken); // Sets global token and cookie immediately

        // INIT mode: initialize new region
        if (switchRegionType === SwitchRegionType.INIT) {
          if (!isString(workspaceName)) throw Error('workspace not found');
          const decodedWorkspaceName = decodeURIComponent(workspaceName);

          const initRegionTokenResult = await initMutation.mutateAsync({
            workspaceName: decodedWorkspaceName
          });

          if (!initRegionTokenResult.data) {
            throw new Error('No result data');
          }

          await sessionConfig(initRegionTokenResult.data);
        } else {
          // Normal mode: get region token
          const regionTokenRes = await getRegionToken();

          if (!regionTokenRes?.data) {
            throw new Error('Failed to get region token');
          }

          await sessionConfig(regionTokenRes.data);

          // Switch workspace if needed
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
        }

        const { instanceName, error: deploymentError } = await handleTemplateDeployment();

        if (openapp && typeof openapp === 'string') {
          let finalOpenapp = openapp;

          // If we have an instance name and openapp is system-template, add the instance path
          if (instanceName && openapp === 'system-template') {
            // Format: system-template?/instance?instanceName=xxx
            finalOpenapp = `${openapp}?/instance?instanceName=${instanceName}`;
          } else if (instanceName && openapp === 'system-brain') {
            // Format: system-brain?/projects/instanceName?
            finalOpenapp = `${openapp}?/projects/${instanceName}?`;
          }

          const { appkey, appQuery, appPath } = parseOpenappQuery(finalOpenapp);
          if (appkey) {
            setAutoLaunch(appkey, { raw: appQuery, pathname: appPath });
          }

          const redirectUrl = `/?openapp=${encodeURIComponent(finalOpenapp)}`;
          await router.replace(redirectUrl);
          if (deploymentError) {
            setTimeout(() => {
              toast({
                title: deploymentError,
                status: 'error',
                position: 'top',
                duration: 10000,
                isClosable: true
              });
            }, 500);
          }
        } else {
          await router.replace('/');
          if (deploymentError) {
            setTimeout(() => {
              toast({
                title: deploymentError,
                status: 'error',
                position: 'top',
                duration: 10000,
                isClosable: true
              });
            }, 500);
          }
        }
      } catch (error) {
        setGlobalToken('');
        await router.replace('/signin');
      }
    };

    const handleTemplateDeployment = async (): Promise<{
      instanceName: string | null;
      error: string | null;
    }> => {
      if (templateName && typeof templateName === 'string') {
        let parsedTemplateForm: Record<string, any> = {};

        if (templateForm !== undefined) {
          try {
            parsedTemplateForm =
              typeof templateForm === 'string' ? JSON.parse(templateForm) : templateForm;
          } catch (error) {
            return { instanceName: null, error: 'Failed to parse template form' };
          }
        }

        try {
          const result = await createTemplateInstance({
            templateName,
            templateForm: parsedTemplateForm
          });

          // Check if template service returned an error
          const templateServiceError = result?.data as any;
          if (
            result.code !== 200 ||
            (templateServiceError?.code && templateServiceError.code !== 200)
          ) {
            // Check if it's a subscription expired error
            const k8sError = templateServiceError?.error;
            const errorMessage = k8sError?.message || '';
            const isSubscriptionExpired =
              k8sError?.code === 403 &&
              errorMessage.includes('subscription status') &&
              errorMessage.includes('expired');

            const errorMsg = isSubscriptionExpired
              ? 'Workspace subscription has expired. Please contact the administrator.'
              : result.message ||
                templateServiceError?.message ||
                'Failed to create template instance';

            return { instanceName: null, error: errorMsg };
          }

          // Extract instance name from result
          // The API returns an array of K8s resources, find the Instance resource
          let instanceName: string | null = null;

          if (result?.data?.data && Array.isArray(result.data.data)) {
            const instanceResource = result.data.data.find((item: any) => item.kind === 'Instance');

            instanceName = instanceResource?.metadata?.name || null;
          }

          return { instanceName, error: null };
        } catch (error) {
          return {
            instanceName: null,
            error: error instanceof Error ? error.message : 'Failed to create template instance'
          };
        }
      }
      return { instanceName: null, error: null };
    };

    const handleSaveParams = () => {
      if (templateName && typeof templateName === 'string') {
        let parsedTemplateForm: Record<string, any> = {};

        if (templateForm !== undefined) {
          try {
            parsedTemplateForm =
              typeof templateForm === 'string' ? JSON.parse(templateForm) : templateForm;
          } catch (error) {
            parsedTemplateForm = {};
          }
        }

        setAutoDeployTemplate(templateName, parsedTemplateForm);
      }

      if (openapp && typeof openapp === 'string') {
        try {
          const { appkey, appQuery, appPath } = parseOpenappQuery(openapp);
          if (appkey) {
            setAutoLaunch(appkey, { raw: appQuery, pathname: appPath });
          }
        } catch (error) {}
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
        router.replace('/signin');
      }
    };

    if (token && typeof token === 'string') {
      handleTokenLogin();
      return;
    }

    if (isUserLogin()) {
      hasProcessedRef.current = true;

      (async () => {
        let instanceName: string | null = null;
        let deploymentError: string | null = null;
        try {
          // Only deploy template if templateName is provided
          if (templateName && typeof templateName === 'string') {
            const result = await handleTemplateDeployment();
            instanceName = result.instanceName;
            deploymentError = result.error;
          }
        } catch (error) {
          console.error('[OAuth] Template deployment error:', error);
        } finally {
          cancelAutoDeployTemplate();

          if (openapp && typeof openapp === 'string') {
            let finalOpenapp = openapp;

            // If we have an instance name and openapp is system-template, add the instance path
            if (instanceName && openapp === 'system-template') {
              // Format: system-template?/instance?instanceName=xxx
              finalOpenapp = `${openapp}?/instance?instanceName=${instanceName}`;
            } else if (instanceName && openapp === 'system-brain') {
              // Format: system-brain?/projects/instanceName?
              finalOpenapp = `${openapp}?/projects/${instanceName}?`;
            }

            const redirectUrl = `/?openapp=${encodeURIComponent(finalOpenapp)}`;
            router.replace(redirectUrl);

            if (deploymentError) {
              setTimeout(() => {
                toast({
                  title: deploymentError,
                  status: 'error',
                  position: 'top',
                  duration: 10000,
                  isClosable: true
                });
              }, 500);
            }
          } else {
            router.replace('/');

            if (deploymentError) {
              setTimeout(() => {
                toast({
                  title: deploymentError,
                  status: 'error',
                  position: 'top',
                  duration: 10000,
                  isClosable: true
                });
              }, 500);
            }
          }
        }
      })();
      return;
    }

    hasProcessedRef.current = true;
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
