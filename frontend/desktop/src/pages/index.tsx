import { getPlanInfo, UserInfo } from '@/api/auth';
import { nsListRequest, switchRequest } from '@/api/namespace';
import { createTemplateInstance } from '@/api/platform';
import DesktopContent from '@/components/desktop_content';
import { PhoneBindingModal } from '@/components/account/AccountCenter/PhoneBindingModal';
import { trackEventName } from '@/constants/account';
import { useSemParams } from '@/hooks/useSemParams';
import { useLicenseCheck } from '@/hooks/useLicenseCheck';
import useAppStore from '@/stores/app';
import useCallbackStore from '@/stores/callback';
import { useConfigStore } from '@/stores/config';
import { useDesktopConfigStore } from '@/stores/desktopConfig';
import useScriptStore from '@/stores/script';
import useSessionStore from '@/stores/session';
import { SemData } from '@/types/sem';
import { NSType } from '@/types/team';
import { AccessTokenPayload } from '@/types/token';
import { parseOpenappQuery } from '@/utils/format';
import { sessionConfig, setAdClickData, setUserSemData } from '@/utils/sessionConfig';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';
import { ensureLocaleCookie } from '@/utils/ssrLocale';
import { Box, useColorMode, useDisclosure } from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { jwtDecode } from 'jwt-decode';
import { isString } from 'lodash';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Script from 'next/script';
import { createContext, useEffect, useMemo, useState } from 'react';
import 'react-contexify/dist/ReactContexify.css';

const destination = '/signin';

function checkIfEverLoggedIn(): boolean {
  const sessionStore = useSessionStore.getState();
  if (sessionStore.hasEverLoggedIn) {
    return true;
  }

  const hasHistory =
    !!sessionStore.lastWorkSpaceId || !!sessionStore.lastSigninProvier || !!sessionStore.firstUse;

  if (hasHistory) {
    sessionStore.setHasEverLoggedIn(true);
    return true;
  }

  return false;
}

interface IMoreAppsContext {
  showMoreApps: boolean;
  setShowMoreApps: (value: boolean) => void;
}
export const MoreAppsContext = createContext<IMoreAppsContext | null>(null);

export default function Home({ sealos_cloud_domain }: { sealos_cloud_domain: string }) {
  const router = useRouter();
  const { firstUse, setFirstUse, isUserLogin, setGuestSession, setSessionProp } = useSessionStore();
  const { colorMode, toggleColorMode } = useColorMode();
  const init = useAppStore((state) => state.init);
  const setAutoLaunch = useAppStore((state) => state.setAutoLaunch);
  const { autolaunchWorkspaceUid, autoDeployTemplate, autoDeployTemplateForm } = useAppStore();
  const cancelAutoDeployTemplate = useAppStore((state) => state.cancelAutoDeployTemplate);
  const { session, token } = useSessionStore();
  const { layoutConfig, commonConfig, trackingConfig, authConfig, cloudConfig } = useConfigStore();
  const { workspaceInviteCode, setWorkspaceInviteCode } = useCallbackStore();
  const { setCanShowGuide } = useDesktopConfigStore();
  const { setCaptchaIsLoad } = useScriptStore();

  // Initialize license check after user login
  useLicenseCheck({
    enabled: isUserLogin() && !!commonConfig?.licenseCheckEnabled
  });

  // Phone binding check for domestic version
  const {
    isOpen: isPhoneBindingModalOpen,
    onOpen: onPhoneBindingModalOpen,
    onClose: onPhoneBindingModalClose
  } = useDisclosure();

  const { data: userInfo } = useQuery({
    queryKey: [token, 'UserInfo'],
    queryFn: UserInfo,
    enabled: isUserLogin() && !!token,
    select: (data) => data.data?.info
  });

  // Check if phone binding is required
  useEffect(() => {
    if (!isUserLogin() || !userInfo || !layoutConfig || !authConfig) {
      return;
    }

    const isDomesticVersion = layoutConfig.version === 'cn';
    if (!isDomesticVersion) {
      return;
    }

    const isSmsEnabled = authConfig.idp?.sms?.enabled && authConfig.idp?.sms?.enabled;
    if (!isSmsEnabled) {
      return;
    }

    const hasPhoneBinding = userInfo.oauthProvider?.some(
      (provider) => provider.providerType === 'PHONE'
    );

    if (!hasPhoneBinding) {
      onPhoneBindingModalOpen();
    }
  }, [isUserLogin, userInfo, layoutConfig, authConfig, onPhoneBindingModalOpen]);

  useEffect(() => {
    colorMode === 'dark' ? toggleColorMode() : null;
  }, [colorMode, toggleColorMode]);

  const [showMoreApps, setShowMoreApps] = useState(false);
  const queryClient = useQueryClient();
  const swtichWorksapceMutation = useMutation({
    mutationFn: switchRequest,
    async onSuccess(data) {
      if (data.code === 200 && !!data.data && session) {
        const payload = jwtDecode<AccessTokenPayload>(data.data.token);
        await sessionConfig({
          ...data.data,
          kubeconfig: switchKubeconfigNamespace(session.kubeconfig, payload.workspaceId)
        });
        queryClient.clear();
      } else {
        throw Error('session in invalid');
      }
    }
  });
  const workspaceQuery = useQuery({
    queryKey: ['teamList', 'teamGroup'],
    queryFn: nsListRequest,
    enabled: isUserLogin()
  });
  const workspaces = useMemo(
    () => workspaceQuery?.data?.data?.namespaces || [],
    [workspaceQuery.data]
  );

  // openApp by query && switch workspace
  useEffect(() => {
    const handleInit = async () => {
      const { query } = router;
      const is_login = isUserLogin();

      if (!is_login) {
        // check if user has logged in before
        const hasLoggedInBefore = checkIfEverLoggedIn();
        console.log('hasLoggedInBefore', hasLoggedInBefore);
        setFirstUse(null);

        const { appkey, appQuery, appPath } = parseOpenappQuery((query?.openapp as string) || '');

        // save autolaunch info (for guest and logged in user)
        let workspaceUid: string | undefined;
        if (isString(query?.workspaceUid)) workspaceUid = query.workspaceUid;
        if (appkey && (appQuery || appPath)) {
          setAutoLaunch(appkey, { raw: appQuery, pathname: appPath }, workspaceUid);
        }

        if (hasLoggedInBefore) {
          // logged in user (logged out) → redirect to login page
          router.replace('/signin');
        } else {
          // Set guest session by default to prevent requests from being blocked while the config is loading
          const isGuest = useSessionStore.getState().isGuest();
          if (!isGuest) {
            console.log('Setting guest session by default');
            setGuestSession();
          }
          if (!layoutConfig?.common) return;

          // If guest mode is disabled in the config, clear the guest session and redirect to login page
          if (layoutConfig.common.guestModeEnabled !== true) {
            // Clear guest session
            useSessionStore.getState().delSession();
            return router.replace('/signin');
          }

          // Guest mode enabled, continue guest session process
          const state = await init();
          if (appkey) {
            const guestAllowedApps = ['system-brain'];
            if (guestAllowedApps.includes(appkey)) {
              const app = state.installedApps.find((item) => item.key === appkey);
              if (app) {
                console.log(`Guest mode: Opening app ${appkey}`);
                state.openApp(app, { raw: appQuery, pathname: appPath }).then(() => {
                  state.cancelAutoLaunch();
                });
              }
            }
          }
          return;
        }
      } else {
        useSessionStore.getState().setHasEverLoggedIn(true);
      }
      // Check for Stripe callback with workspace switch
      const isStripeCallback = query?.stripeState === 'success' && query?.payId;
      // logged in user logic
      let workspaceUid: string | undefined;

      // For Stripe callback, convert namespace (ns-xxx) to workspace UID
      if (isStripeCallback && isString(query?.workspaceId)) {
        // query.workspaceId contains the namespace (e.g., "ns-abc123")
        // Find the corresponding workspace object to get the UID
        const targetWorkspace = workspaces.find((w) => w.id === query.workspaceId);
        workspaceUid = targetWorkspace?.uid;
      } else if (!autolaunchWorkspaceUid) {
        // Use workspace UID from query if no autolaunch (backwards compatibility)
        if (isString(query?.workspaceUid)) workspaceUid = query.workspaceUid;
      } else {
        // Use autolaunch workspace UID if available
        workspaceUid = autolaunchWorkspaceUid;
      }

      Promise.resolve()
        .then(() => {
          // Handle Stripe callback - workspace switch required
          if (isStripeCallback && workspaceUid) {
            // Create callback action to execute after workspace switch
            const afterSwitchAction = async () => {
              const state = await init();

              // Build query parameters for costcenter
              const callbackParams = new URLSearchParams();
              callbackParams.set('stripeState', 'success');
              callbackParams.set('payId', query.payId as string);
              if (query.workspaceId) {
                callbackParams.set('workspaceId', query.workspaceId as string);
              }

              // Open costcenter with callback parameters
              const app = state.installedApps.find((item) => item.key === 'system-costcenter');
              if (app) {
                setCanShowGuide(false);
                await state.openApp(app, { raw: callbackParams.toString() });
              }

              // Clear the URL parameters to avoid re-triggering
              router.replace(router.pathname, undefined, { shallow: true });
            };

            // Switch workspace with callback action
            return swtichWorksapceMutation
              .mutateAsync(workspaceUid)
              .then(() => {
                // Execute callback action after workspace switch completes
                return afterSwitchAction();
              })
              .catch((err) => {
                console.error(err);
                return Promise.resolve();
              });
          }

          // Handle normal workspace switch (non-Stripe)
          if (workspaceUid) {
            return swtichWorksapceMutation
              .mutateAsync(workspaceUid)
              .then(() => {
                return Promise.resolve();
              })
              .catch((err) => {
                // workspace not found or other error
                console.error(err);
                return Promise.resolve();
              });
          }

          return Promise.resolve();
        })
        .then(() => {
          // Skip normal app opening logic if this is a Stripe callback
          if (isStripeCallback) return;

          return init();
        })
        .then(async (state) => {
          // Skip normal app opening logic if this is a Stripe callback
          if (isStripeCallback || !state) return;

          console.log('[Index] Checking for auto deploy template:', {
            autoDeployTemplate: state.autoDeployTemplate,
            autoDeployTemplateForm: state.autoDeployTemplateForm
          });

          // Handle auto deploy template (priority over autolaunch)
          if (state.autoDeployTemplate && state.autoDeployTemplateForm) {
            console.log('[Index] Auto deploying template from store:', {
              templateName: state.autoDeployTemplate,
              templateForm: state.autoDeployTemplateForm
            });
            try {
              const result = await createTemplateInstance({
                templateName: state.autoDeployTemplate,
                templateForm: state.autoDeployTemplateForm
              });
              console.log('[Index] Template instance created successfully:', result);
            } catch (error) {
              console.error('[Index] Failed to create template instance:', error);
            } finally {
              console.log('[Index] Clearing auto deploy template from store');
              cancelAutoDeployTemplate();
            }
          } else {
            console.log('[Index] No auto deploy template found in store');
          }

          let appQuery = '';
          let appkey = '';
          let appRoute = '';

          if (!state.autolaunch) {
            setCanShowGuide(true);
            const result = parseOpenappQuery((query?.openapp as string) || '');
            appQuery = result.appQuery;
            appkey = result.appkey;
            appRoute = result.appPath || '';
            if (!!query.openapp) router.replace(router.pathname);
          } else {
            appkey = state.autolaunch;
            appQuery = state.launchQuery.raw || '';
            appRoute = state.launchQuery.pathname || '';
          }

          if (!appkey) return;
          if (appkey === 'system-brain' && appRoute === '/trial') {
            appRoute = '/';
            // Remove sessionId from appQuery but keep other parameters
            if (appQuery) {
              const params = new URLSearchParams(appQuery);
              params.delete('sessionId');
              appQuery = params.toString();
            }
          }
          const app = state.installedApps.find((item) => item.key === appkey);

          if (!app) return;
          setCanShowGuide(false);
          state.openApp(app, { raw: appQuery, pathname: appRoute }).then(() => {
            state.cancelAutoLaunch();
          });
        });
    };
    handleInit();
  }, [router, sealos_cloud_domain, workspaces, layoutConfig?.common]);

  // check workspace
  useEffect(() => {
    if (swtichWorksapceMutation.isLoading) return;
    let workspaceUid: string | undefined;
    // Check if there's no autolaunch workspace UID
    const currentWorkspaceUid = session?.user?.ns_uid;
    if (currentWorkspaceUid) {
      workspaceUid = currentWorkspaceUid;
    }
    // Ensure workspaces exist
    if (workspaces.length === 0) {
      console.log('No workspaces found');
      // throw new Error('No workspaces found');
    }
    const needDefault =
      workspaces.findIndex((w) => w.uid === workspaceUid) === -1 && workspaces.length > 0;
    if (!needDefault) {
      return;
    }
    const defaultWorkspace = workspaces.find((w) => w.nstype === NSType.Private);
    // Fallback to default workspace UID
    workspaceUid = defaultWorkspace?.uid;

    if (!workspaceUid) return;
    swtichWorksapceMutation.mutate(workspaceUid);
  }, [session?.user?.ns_uid, workspaces]);

  // Grab params from ad clicks and store in local storage
  const { adClickData, semData } = useSemParams();
  useEffect(() => {
    if (adClickData) {
      setAdClickData(adClickData);
    }

    if (semData) {
      setUserSemData(semData);
    }
  });

  // handle workspaceInvite
  useEffect(() => {
    if (workspaceInviteCode) {
      router.replace('/WorkspaceInvite?code=' + workspaceInviteCode);
      return;
    }
  }, [workspaceInviteCode]);

  // Refresh subscription for logged-in users if missing
  useEffect(() => {
    const refreshSubscription = async () => {
      if (!isUserLogin() || !session?.user || !token) {
        return;
      }
      if (session.subscription === undefined || session.subscription === null) {
        try {
          const payload = jwtDecode<AccessTokenPayload>(token);
          const workspaceId = payload.workspaceId;

          if (workspaceId) {
            const planInfo = await getPlanInfo(workspaceId);
            if (planInfo?.data?.subscription) {
              setSessionProp('subscription', planInfo.data.subscription);
            }
          }
        } catch (error) {
          console.error('Failed to refresh subscription:', error);
        }
      }
    };

    refreshSubscription();
  }, [session, token, setSessionProp, isUserLogin]);

  useEffect(() => {
    (async (state) => {
      try {
        if (
          commonConfig?.trackingEnabled &&
          session?.user &&
          (!firstUse || !dayjs(firstUse).isSame(dayjs(), 'day'))
        ) {
          const umami = window.umami;
          if (!!umami) {
            const result = await umami.track(trackEventName.dailyLoginFirst, {
              userId: session?.user?.userId!,
              userUid: session?.user?.userUid!
            });
            if (result.ok && result.status === 200) {
              setFirstUse(new Date());
            } else {
              console.error('Failed to update first use date');
            }
          }
        }
      } catch (e) {
        console.log(e);
      }
    })();
  }, [commonConfig, firstUse]);

  return (
    <Box position={'relative'} overflow={'hidden'} w="100vw" h="100vh">
      <Head>
        <title>{layoutConfig?.meta.title}</title>
        <meta name="description" content={layoutConfig?.meta.description} />
        <link rel="shortcut icon" href={layoutConfig?.logo ? layoutConfig?.logo : '/favicon.ico'} />
        <link rel="icon" href={layoutConfig?.logo ? layoutConfig?.logo : '/favicon.ico'} />
      </Head>
      {authConfig?.captcha.ali.enabled && (
        <Script
          src="https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js"
          onLoad={() => {
            setCaptchaIsLoad();
          }}
        />
      )}
      <MoreAppsContext.Provider value={{ showMoreApps, setShowMoreApps }}>
        <DesktopContent />
      </MoreAppsContext.Provider>

      {/* Phone binding modal for domestic version */}
      <PhoneBindingModal isOpen={isPhoneBindingModalOpen} onClose={onPhoneBindingModalClose} />
    </Box>
  );
}

export async function getServerSideProps({ req, res, locales }: any) {
  const local = ensureLocaleCookie({ req, res, defaultLocale: 'en' });

  const sealos_cloud_domain = global.AppConfig?.cloud.domain || 'cloud.sealos.io';
  return {
    props: {
      ...(await serverSideTranslations(
        local,
        ['common', 'cloudProviders', 'error', 'applist', 'v2'],
        null,
        locales || []
      )),
      sealos_cloud_domain
    }
  };
}
