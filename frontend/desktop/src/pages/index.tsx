import { nsListRequest, switchRequest } from '@/api/namespace';
import DesktopContent from '@/components/desktop_content';
import { trackEventName } from '@/constants/account';
import { useSemParams } from '@/hooks/useSemParams';
import useAppStore from '@/stores/app';
import useCallbackStore from '@/stores/callback';
import { useConfigStore } from '@/stores/config';
import { useDesktopConfigStore } from '@/stores/desktopConfig';
import useSessionStore from '@/stores/session';
import { SemData } from '@/types/sem';
import { NSType } from '@/types/team';
import { AccessTokenPayload } from '@/types/token';
import { parseOpenappQuery } from '@/utils/format';
import { sessionConfig, setAdClickData, setInviterId, setUserSemData } from '@/utils/sessionConfig';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';
import { compareFirstLanguages } from '@/utils/tools';
import { Box, useColorMode } from '@chakra-ui/react';
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
interface IMoreAppsContext {
  showMoreApps: boolean;
  setShowMoreApps: (value: boolean) => void;
}
export const MoreAppsContext = createContext<IMoreAppsContext | null>(null);

export default function Home({ sealos_cloud_domain }: { sealos_cloud_domain: string }) {
  const router = useRouter();
  const { firstUse, setFirstUse, isUserLogin } = useSessionStore();
  const { colorMode, toggleColorMode } = useColorMode();
  const init = useAppStore((state) => state.init);
  const setAutoLaunch = useAppStore((state) => state.setAutoLaunch);
  const { autolaunchWorkspaceUid } = useAppStore();
  const { session } = useSessionStore();
  const { layoutConfig, commonConfig, trackingConfig } = useConfigStore();
  const { workspaceInviteCode, setWorkspaceInviteCode } = useCallbackStore();
  const { setCanShowGuide } = useDesktopConfigStore();

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
    const { query } = router;
    const is_login = isUserLogin();
    const whitelistApps = ['system-template', 'system-fastdeploy'];
    if (!is_login) {
      // clear firstusetime
      setFirstUse(null);

      const { appkey, appQuery } = parseOpenappQuery((query?.openapp as string) || '');
      // Invited new user
      if (query?.uid && typeof query?.uid === 'string') {
        setInviterId(query.uid);
      }
      // sealos_inside=true internal call
      if (whitelistApps.includes(appkey) && appQuery.indexOf('sealos_inside=true') === -1) {
        sessionStorage.setItem(
          'accessTemplatesNoLogin',
          `https://template.${sealos_cloud_domain}/deploy?${appQuery}`
        );
        return;
      }
      let workspaceUid: string | undefined;
      if (isString(query?.workspaceUid)) workspaceUid = query.workspaceUid;
      if (appkey && typeof appQuery === 'string')
        setAutoLaunch(appkey, { raw: appQuery }, workspaceUid);

      router.replace(destination);
    } else {
      // Check for Stripe callback with workspace switch
      const isStripeCallback = query?.stripeState === 'success' && query?.payId;
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
        .then((state) => {
          // Skip normal app opening logic if this is a Stripe callback
          if (isStripeCallback || !state) return;

          let appQuery = '';
          let appkey = '';
          let appRoute = '';

          if (!state.autolaunch) {
            setCanShowGuide(true);
            const result = parseOpenappQuery((query?.openapp as string) || '');
            appQuery = result.appQuery;
            appkey = result.appkey;
            if (!!query.openapp) router.replace(router.pathname);
          } else {
            appkey = state.autolaunch;
            appQuery = state.launchQuery.raw;
          }

          if (!appkey) return;
          if (appkey === 'system-fastdeploy') {
            appkey = 'system-template';
          }
          const app = state.installedApps.find((item) => item.key === appkey);
          if (!app) return;
          setCanShowGuide(false);
          state.openApp(app, { raw: appQuery, pathname: appRoute }).then(() => {
            state.cancelAutoLaunch();
          });
        });
    }
  }, [router, sealos_cloud_domain, workspaces]);

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
  useEffect(() => {
    (async (state) => {
      try {
        if (
          commonConfig?.trackingEnabled &&
          (!firstUse || !dayjs(firstUse).isSame(dayjs(), 'day'))
        ) {
          const umami = window.umami;
          if (!!umami) {
            const result = await umami.track(trackEventName.dailyLoginFirst, {
              userId: session?.user.userId!,
              userUid: session?.user.userUid!
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
      {/* {layoutConfig?.meta.scripts?.map((item, i) => {
        return <Script key={i} {...item} />;
      })} */}
      <MoreAppsContext.Provider value={{ showMoreApps, setShowMoreApps }}>
        <DesktopContent />
      </MoreAppsContext.Provider>
    </Box>
  );
}

export async function getServerSideProps({ req, res, locales }: any) {
  const local =
    req?.cookies?.NEXT_LOCALE || compareFirstLanguages(req?.headers?.['accept-language'] || 'zh');
  res.setHeader('Set-Cookie', `NEXT_LOCALE=${local}; Max-Age=2592000; Secure; SameSite=None`);

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
