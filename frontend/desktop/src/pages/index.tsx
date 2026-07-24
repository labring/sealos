import { getPlanInfo, UserInfo } from '@/api/auth';
import { nsListRequest, switchRequest } from '@/api/namespace';
import DesktopContent from '@/components/desktop_content';
import { PhoneBindingModal } from '@/components/account/AccountCenter/PhoneBindingModal';
import { trackEventName } from '@/constants/account';
import { useSemParams } from '@/hooks/useSemParams';
import { useLicenseCheck } from '@/hooks/useLicenseCheck';
import useAppStore, { BRAIN_APP_KEY, SESSION_RESTORE_APP_KEY } from '@/stores/app';
import useCallbackStore from '@/stores/callback';
import { useConfigStore } from '@/stores/config';
import { useDesktopConfigStore } from '@/stores/desktopConfig';
import useScriptStore from '@/stores/script';
import useSessionStore from '@/stores/session';
import { SemData } from '@/types/sem';
import { NSType } from '@/types/team';
import { AccessTokenPayload } from '@/types/token';
import { parseOpenappQuery } from '@/utils/format';
import { resolveInitialAppTarget } from '@/utils/initialAppTarget';
import type { InitialAppLaunchState } from '@/utils/initialAppTarget';
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
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type InitialOpenAppIntent = {
  hasOpenAppQuery: boolean;
  value: string;
};

export default function Home({ sealos_cloud_domain }: { sealos_cloud_domain: string }) {
  const router = useRouter();
  const { firstUse, setFirstUse, isUserLogin, setGuestSession, setSessionProp } = useSessionStore();
  const { colorMode, toggleColorMode } = useColorMode();
  const init = useAppStore((state) => state.init);
  const setAutoLaunch = useAppStore((state) => state.setAutoLaunch);
  const { autolaunchWorkspaceUid } = useAppStore();
  const { session, token } = useSessionStore();
  const { layoutConfig, commonConfig, trackingConfig, authConfig, cloudConfig } = useConfigStore();
  const { workspaceInviteCode, setWorkspaceInviteCode } = useCallbackStore();
  const { setCanShowGuide } = useDesktopConfigStore();
  const { setCaptchaIsLoad } = useScriptStore();
  const [initialAppLaunch, setInitialAppLaunch] = useState<InitialAppLaunchState>({
    status: 'resolving'
  });
  const initialOpenAppIntentRef = useRef<InitialOpenAppIntent | null>(null);
  const initialLaunchResolvedRef = useRef(false);
  const initialLaunchInFlightRef = useRef(false);

  const handleInitialAppLoaded = useCallback((appKey: string) => {
    setInitialAppLaunch((current) =>
      current.status === 'loading' && current.appKey === appKey ? { status: 'ready' } : current
    );
  }, []);

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
    if (!router.isReady || initialLaunchResolvedRef.current || initialLaunchInFlightRef.current) {
      return;
    }

    if (!initialOpenAppIntentRef.current) {
      initialOpenAppIntentRef.current = {
        hasOpenAppQuery: Object.hasOwn(router.query, 'openapp'),
        value: isString(router.query.openapp) ? router.query.openapp : ''
      };
    }

    const handleInit = async () => {
      initialLaunchInFlightRef.current = true;
      const { query } = router;
      const initialOpenAppIntent = initialOpenAppIntentRef.current;
      const parsedOpenApp = parseOpenappQuery(initialOpenAppIntent?.value || '');

      const completeWithDesktop = () => {
        initialLaunchResolvedRef.current = true;
        setCanShowGuide(true);
        setInitialAppLaunch({ status: 'ready' });
      };

      const openInitialApp = async ({
        state,
        appKey,
        raw = '',
        pathname = '/',
        cancelAutoLaunch = false
      }: {
        state: Awaited<ReturnType<typeof init>>;
        appKey: string;
        raw?: string;
        pathname?: string;
        cancelAutoLaunch?: boolean;
      }) => {
        const app = state.installedApps.find((item) => item.key === appKey);
        if (!app) {
          completeWithDesktop();
          return;
        }

        let appQuery = raw;
        let appRoute = pathname;
        if (appKey === BRAIN_APP_KEY && appRoute === '/trial') {
          appRoute = '/';
          if (appQuery) {
            const params = new URLSearchParams(appQuery);
            params.delete('sessionId');
            appQuery = params.toString();
          }
        }

        const wasAlreadyRunning = state.runningInfo.some((item) => item.key === appKey);
        initialLaunchResolvedRef.current = true;
        setCanShowGuide(false);
        setInitialAppLaunch({ status: 'loading', appKey });

        try {
          await state.openApp(app, { raw: appQuery, pathname: appRoute });
          if (cancelAutoLaunch) {
            state.cancelAutoLaunch();
          }

          const isRunning = useAppStore.getState().runningInfo.some((item) => item.key === appKey);
          if (wasAlreadyRunning || !isRunning) {
            setInitialAppLaunch({ status: 'ready' });
          }
        } catch (error) {
          console.error(`Failed to open initial app ${appKey}`, error);
          setInitialAppLaunch({ status: 'ready' });
        }
      };

      const resolveAndOpenInitialApp = async (
        state: Awaited<ReturnType<typeof init>>,
        guestMode: boolean
      ) => {
        const target = resolveInitialAppTarget({
          installedAppKeys: state.installedApps.map((app) => app.key),
          autolaunchAppKey: state.autolaunch,
          hasOpenAppQuery: initialOpenAppIntent?.hasOpenAppQuery || false,
          queryAppKey: parsedOpenApp.appkey,
          restoreAppKeys: [
            sessionStorage.getItem(SESSION_RESTORE_APP_KEY) || undefined,
            state.currentAppKey
          ],
          defaultAppKey: BRAIN_APP_KEY,
          allowedAppKeys: guestMode ? [BRAIN_APP_KEY] : undefined
        });

        if (
          target.source === 'query' ||
          (target.kind === 'desktop' &&
            target.source === 'explicit-unavailable' &&
            initialOpenAppIntent?.value)
        ) {
          void router.replace(router.pathname, undefined, { shallow: true });
        }

        if (target.kind === 'desktop') {
          if (target.source === 'explicit-desktop') {
            sessionStorage.removeItem(SESSION_RESTORE_APP_KEY);
          }
          completeWithDesktop();
          return;
        }

        let raw = '';
        let pathname = '/';
        if (target.source === 'autolaunch') {
          raw = state.launchQuery.raw || '';
          pathname = state.launchQuery.pathname || '';
        } else if (target.source === 'query') {
          raw = parsedOpenApp.appQuery;
          pathname = parsedOpenApp.appPath || '';
        }

        await openInitialApp({
          state,
          appKey: target.appKey,
          raw,
          pathname,
          cancelAutoLaunch: target.source === 'autolaunch' || target.source === 'query'
        });
      };

      try {
        const is_login = isUserLogin();

        if (!is_login) {
          // check if user has logged in before
          const hasLoggedInBefore = checkIfEverLoggedIn();
          console.log('hasLoggedInBefore', hasLoggedInBefore);
          setFirstUse(null);

          // save autolaunch info (for guest and logged in user)
          let workspaceUid: string | undefined;
          if (isString(query?.workspaceUid)) workspaceUid = query.workspaceUid;
          if (parsedOpenApp.appkey && (parsedOpenApp.appQuery || parsedOpenApp.appPath)) {
            setAutoLaunch(
              parsedOpenApp.appkey,
              { raw: parsedOpenApp.appQuery, pathname: parsedOpenApp.appPath },
              workspaceUid
            );
          }

          if (hasLoggedInBefore) {
            // logged in user (logged out) → redirect to login page
            initialLaunchResolvedRef.current = true;
            await router.replace('/signin');
            return;
          }

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
            initialLaunchResolvedRef.current = true;
            await router.replace('/signin');
            return;
          }

          // Guest mode enabled, continue guest session process
          const state = await init();
          await resolveAndOpenInitialApp(state, true);
          return;
        }

        useSessionStore.getState().setHasEverLoggedIn(true);

        // Check for Stripe callback with workspace switch
        const isStripeCallback = query?.stripeState === 'success' && !!query?.payId;
        let workspaceUid: string | undefined;

        // workspaceId is a namespace, so wait until the namespace-to-UID mapping is available.
        if (isStripeCallback && isString(query?.workspaceId) && workspaceQuery.isLoading) {
          return;
        }

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

        if (isStripeCallback) {
          if (!workspaceUid) {
            completeWithDesktop();
            return;
          }

          try {
            await swtichWorksapceMutation.mutateAsync(workspaceUid);
          } catch (error) {
            console.error(error);
            completeWithDesktop();
            return;
          }

          const state = await init();
          const callbackParams = new URLSearchParams();
          callbackParams.set('stripeState', 'success');
          callbackParams.set('payId', query.payId as string);
          if (query.workspaceId) {
            callbackParams.set('workspaceId', query.workspaceId as string);
          }

          await openInitialApp({
            state,
            appKey: 'system-costcenter',
            raw: callbackParams.toString()
          });
          void router.replace(router.pathname, undefined, { shallow: true });
          return;
        }

        // Handle normal workspace switch
        if (workspaceUid) {
          try {
            await swtichWorksapceMutation.mutateAsync(workspaceUid);
          } catch (error) {
            // workspace not found or other error
            console.error(error);
          }
        }

        const state = await init();
        await resolveAndOpenInitialApp(state, false);
      } catch (error) {
        console.error('Failed to initialize Desktop', error);
        if (!initialLaunchResolvedRef.current) {
          completeWithDesktop();
        }
      } finally {
        initialLaunchInFlightRef.current = false;
      }
    };
    void handleInit();
  }, [
    autolaunchWorkspaceUid,
    init,
    isUserLogin,
    layoutConfig?.common,
    router,
    router.isReady,
    sealos_cloud_domain,
    setAutoLaunch,
    setCanShowGuide,
    setFirstUse,
    setGuestSession,
    swtichWorksapceMutation,
    workspaceQuery.isLoading,
    workspaces
  ]);

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
        <DesktopContent
          initialAppLaunch={initialAppLaunch}
          onInitialAppLoaded={handleInitialAppLoaded}
        />
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
