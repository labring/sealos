import { useRouter } from 'next/router';
import { useEffect } from 'react';
import useSessionStore from '@/stores/session';
import useSigninPageStore from '@/stores/signinPageStore';
import { ApiResp } from '@/types';
import { Flex, Spinner } from '@chakra-ui/react';
import { isString } from 'lodash';
import {
  bindRequest,
  getRegionToken,
  signInRequest,
  unBindRequest,
  autoInitRegionToken
} from '@/api/auth';
import { getAdClickData, getUserSemData, sessionConfig } from '@/utils/sessionConfig';
import useCallbackStore, { MergeUserStatus } from '@/stores/callback';
import { ProviderType } from 'prisma/global/generated/client';
import request from '@/services/request';
import { BIND_STATUS } from '@/types/response/bind';
import { MERGE_USER_READY } from '@/types/response/utils';
import { AxiosError, HttpStatusCode } from 'axios';
import { gtmLoginSuccess } from '@/utils/gtm';
import { useGuideModalStore } from '@/stores/guideModal';
import { ensureLocaleCookie } from '@/utils/ssrLocale';
import useAppStore from '@/stores/app';

export default function Callback() {
  const router = useRouter();
  const setProvider = useSessionStore((s) => s.setProvider);
  const setGlobalToken = useSessionStore((s) => s.setGlobalToken);
  const provider = useSessionStore((s) => s.provider);
  const compareState = useSessionStore((s) => s.compareState);
  const { setSigninPageAction } = useSigninPageStore();
  const { setMergeUserData, setMergeUserStatus } = useCallbackStore();
  useEffect(() => {
    if (!router.isReady) return;
    let isProxy: boolean = false;
    (async () => {
      try {
        if (!provider || !['GITHUB', 'WECHAT', 'GOOGLE', 'OAUTH2'].includes(provider))
          throw new Error('provider error');
        const { code, state } = router.query;
        if (!isString(code)) throw new Error('failed to get code');

        // Parse state to get action, default to LOGIN if state is not provided
        let action = 'LOGIN';
        let statePayload: string[] = [];
        if (isString(state)) {
          const compareResult = compareState(state);
          action = compareResult.action;
          statePayload = compareResult.statePayload;
        }

        if (action === 'PROXY') {
          // proxy oauth2.0, PROXY_URL_[ACTION]_STATE
          const [_url, ...ret] = statePayload;
          await new Promise<URL>((resolve, reject) => {
            resolve(new URL(decodeURIComponent(_url)));
          })
            .then(async (url) => {
              const result = (await request(`/api/auth/canProxy?domain=${url.host}`)) as ApiResp<{
                containDomain: boolean;
              }>;
              isProxy = true;
              if (result.data?.containDomain) {
                url.searchParams.append('code', code);
                url.searchParams.append('state', ret.join('_'));
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
        } else {
          // return
          if (action === 'LOGIN') {
            const data = await signInRequest(provider)({
              code,
              semData: getUserSemData() ?? undefined,
              adClickData: getAdClickData() ?? undefined
            }).catch((e) => e);
            if (data instanceof Error) {
              throw data;
            }
            setProvider();
            // Consider unknown error if no data returned.
            if (!data) {
              return;
            }

            // GitHub email conflicts with another user.
            if (
              data.data &&
              'error' in data.data &&
              data.data.error === 'OAUTH_PROVIDER_CONFLICT'
            ) {
              setSigninPageAction('PROMPT_REAUTH_GITHUB');
              await router.push({
                pathname: '/signin'
              });
              return;
            }

            if (data.data && data.code === 200 && !('error' in data.data)) {
              const globalToken = data.data?.token; // This is the global token from OAuth
              setGlobalToken(globalToken); // Sets global token and cookie
              const needInit = data.data.needInit;

              // Helper function to handle redirect after login
              const handleLoginRedirect = async () => {
                const appState = useAppStore.getState();
                if (appState.autoDeployTemplate && appState.autoDeployTemplateForm) {
                  const params = new URLSearchParams({
                    templateName: appState.autoDeployTemplate,
                    templateForm: JSON.stringify(appState.autoDeployTemplateForm)
                  });
                  if (appState.autolaunch) {
                    params.append('openapp', appState.autolaunch);
                  }
                  await router.replace(`/oauth?${params.toString()}`);
                } else {
                  await router.replace('/');
                }
              };

              if (needInit) {
                try {
                  const initResult = await autoInitRegionToken();

                  if (initResult?.data) {
                    gtmLoginSuccess({
                      user_type: 'new',
                      method: 'oauth2',
                      oauth2Provider: provider
                    });
                    await sessionConfig(initResult.data);
                    const { setInitGuide } = useGuideModalStore.getState();
                    setInitGuide(true);
                    await handleLoginRedirect();
                  }
                } catch (error) {
                  console.error('Auto init failed, fallback to manual:', error);
                  gtmLoginSuccess({
                    user_type: 'new',
                    method: 'oauth2',
                    oauth2Provider: provider
                  });
                  await router.push('/workspace');
                }
                return;
              }
              gtmLoginSuccess({
                user_type: 'existing',
                method: 'oauth2',
                oauth2Provider: provider
              });
              const regionTokenRes = await getRegionToken();
              if (regionTokenRes?.data) {
                await sessionConfig(regionTokenRes.data);
                await handleLoginRedirect();
              }
            } else {
              throw new Error();
            }
          } else if (action === 'BIND') {
            try {
              const response = await bindRequest(provider)({ code });
              if (response.message === BIND_STATUS.RESULT_SUCCESS) {
                setProvider();
                await router.replace('/');
              } else if (response.message === MERGE_USER_READY.MERGE_USER_CONTINUE) {
                const code = response.data?.code;
                if (!code) return;
                setMergeUserData({
                  providerType: provider as ProviderType,
                  code
                });
                setMergeUserStatus(MergeUserStatus.CANMERGE);
                setProvider();
                await router.replace('/');
              } else if (response.message === MERGE_USER_READY.MERGE_USER_PROVIDER_CONFLICT) {
                setMergeUserData();
                setMergeUserStatus(MergeUserStatus.CONFLICT);
                setProvider();
                await router.replace('/');
              }
            } catch (bindError) {
              if ((bindError as any)?.message === MERGE_USER_READY.MERGE_USER_PROVIDER_CONFLICT) {
                setMergeUserData();
                setMergeUserStatus(MergeUserStatus.CONFLICT);
                setProvider();
                await router.replace('/');
              } else {
                console.log('unkownerror', bindError);
                throw Error();
              }
            }
          } else if (action === 'UNBIND') {
            await unBindRequest(provider)({ code });
            setProvider();
            await router.replace('/');
          }
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
}

export async function getServerSideProps({ req, res }: any) {
  ensureLocaleCookie({ req, res, defaultLocale: 'en' });
  return { props: {} };
}
