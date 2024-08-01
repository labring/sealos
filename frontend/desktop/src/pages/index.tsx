import DesktopContent from '@/components/desktop_content';
import useAppStore from '@/stores/app';
import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import { parseOpenappQuery } from '@/utils/format';
import { setInviterId } from '@/utils/sessionConfig';
import { compareFirstLanguages } from '@/utils/tools';
import { Box, useColorMode } from '@chakra-ui/react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Script from 'next/script';
import { createContext, useEffect, useState } from 'react';
import useCallbackStore from '@/stores/callback';
import 'react-contexify/dist/ReactContexify.css';

const destination = '/signin';
interface IMoreAppsContext {
  showMoreApps: boolean;
  setShowMoreApps: (value: boolean) => void;
}
export const MoreAppsContext = createContext<IMoreAppsContext | null>(null);

export default function Home({ sealos_cloud_domain }: { sealos_cloud_domain: string }) {
  const router = useRouter();
  const { isUserLogin } = useSessionStore();
  const { colorMode, toggleColorMode } = useColorMode();
  const init = useAppStore((state) => state.init);
  const setAutoLaunch = useAppStore((state) => state.setAutoLaunch);
  const { layoutConfig } = useConfigStore();
  const { workspaceInviteCode, setWorkspaceInviteCode } = useCallbackStore();

  useEffect(() => {
    colorMode === 'dark' ? toggleColorMode() : null;
  }, [colorMode, toggleColorMode]);
  const [showMoreApps, setShowMoreApps] = useState(false);

  // openApp by query
  useEffect(() => {
    const { query } = router;
    const is_login = isUserLogin();
    const whitelistApps = ['system-template', 'system-fastdeploy'];
    if (!is_login) {
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
      if (appkey && typeof appQuery === 'string') setAutoLaunch(appkey, { raw: appQuery });
      router.replace(destination);
    } else {
      init().then((state) => {
        let appQuery = '';
        let appkey = '';
        if (!state.autolaunch) {
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
        state.openApp(app, { raw: appQuery }).then(() => {
          state.cancelAutoLaunch();
        });
      });
    }
  }, [router, init, setAutoLaunch, sealos_cloud_domain]);

  // handle baidui
  useEffect(() => {
    const { bd_vid } = router.query;
    if (bd_vid) {
      sessionStorage.setItem('bd_vid', bd_vid as string);
    }
  }, []);

  // handle workspaceInvite
  useEffect(() => {
    if (workspaceInviteCode) {
      router.replace('/WorkspaceInvite?code=' + workspaceInviteCode);
      return;
    }
  }, [workspaceInviteCode]);

  return (
    <Box position={'relative'} overflow={'hidden'} w="100vw" h="100vh">
      <Head>
        <title>{layoutConfig?.meta.title}</title>
        <meta name="description" content={layoutConfig?.meta.description} />
        <link rel="shortcut icon" href={layoutConfig?.logo ? layoutConfig?.logo : '/favicon.ico'} />
        <link rel="icon" href={layoutConfig?.logo ? layoutConfig?.logo : '/favicon.ico'} />w{' '}
      </Head>
      {layoutConfig?.meta.scripts?.map((item, i) => {
        return <Script key={i} {...item} />;
      })}
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
        ['common', 'cloudProviders', 'error'],
        null,
        locales || []
      )),
      sealos_cloud_domain
    }
  };
}
