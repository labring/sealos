import DesktopContent from '@/components/desktop_content';
import FloatButton from '@/components/floating_button';
import MoreApps from '@/components/more_apps';
import { enableRecharge } from '@/services/enable';
import request from '@/services/request';
import useAppStore from '@/stores/app';
import { useGlobalStore } from '@/stores/global';
import useSessionStore from '@/stores/session';
import { ApiResp } from '@/types';
import { SystemConfigType, SystemEnv } from '@/types/system';
import { parseOpenappQuery } from '@/utils/format';
import { compareFirstLanguages } from '@/utils/tools';
import { Box, useColorMode } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Script from 'next/script';
import { createContext, useEffect, useState } from 'react';

const destination = '/signin';
interface IMoreAppsContext {
  showMoreApps: boolean;
  setShowMoreApps: (value: boolean) => void;
}
export const MoreAppsContext = createContext<IMoreAppsContext | null>(null);

export default function Home({ sealos_cloud_domain }: { sealos_cloud_domain: string }) {
  const router = useRouter();
  const { isUserLogin, setSession } = useSessionStore();
  const { colorMode, toggleColorMode } = useColorMode();
  const init = useAppStore((state) => state.init);
  const setAutoLaunch = useAppStore((state) => state.setAutoLaunch);
  const cancelAutoLaunch = useAppStore((state) => state.cancelAutoLaunch);
  const { data: systemConfig, refetch } = useQuery(['getSystemConfig'], () =>
    request<any, ApiResp<SystemConfigType>>('/api/system/getSystemConfig')
  );
  const { data: platformEnv, isSuccess } = useQuery(['getPlatformEnv'], () =>
    request<any, ApiResp<SystemEnv>>('/api/platform/getEnv')
  );
  const setEnv = useGlobalStore((s) => s.setEnv);
  // @ts-ignore
  if (isSuccess) Object.entries(platformEnv?.data!).forEach(([k, v]) => setEnv(k, v));
  useEffect(() => {
    colorMode === 'dark' ? toggleColorMode() : null;
  }, [colorMode, toggleColorMode]);
  const [showMoreApps, setShowMoreApps] = useState(false);

  useEffect(() => {
    const { query } = router;
    const is_login = isUserLogin();
    const whitelistApps = ['system-fastdeploy'];
    if (!is_login) {
      const { appkey, appQuery } = parseOpenappQuery((query?.openapp as string) || '');
      // sealos_inside=true internal call
      if (whitelistApps.includes(appkey) && appQuery.indexOf('sealos_inside=true') === -1) {
        window.open(`https://fastdeploy.${sealos_cloud_domain}/deploy?${appQuery}`, '_self');
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

  return (
    <Box position={'relative'} overflow={'hidden'} w="100vw" h="100vh">
      <Head>
        <title>sealos Cloud</title>
        <meta name="description" content="sealos cloud dashboard" />
      </Head>
      {systemConfig?.data?.scripts?.map((item, i) => {
        return <Script key={i} {...item} />;
      })}
      <MoreAppsContext.Provider value={{ showMoreApps, setShowMoreApps }}>
        <DesktopContent />
        <FloatButton />
        <MoreApps />
      </MoreAppsContext.Provider>
    </Box>
  );
}

export async function getServerSideProps({ req, res, locales }: any) {
  const local =
    req?.cookies?.NEXT_LOCALE || compareFirstLanguages(req?.headers?.['accept-language'] || 'zh');
  res.setHeader('Set-Cookie', `NEXT_LOCALE=${local}; Max-Age=2592000; Secure; SameSite=None`);

  const sealos_cloud_domain = process.env.SEALOS_CLOUD_DOMAIN || 'cloud.sealos.io';
  return {
    props: {
      ...(await serverSideTranslations(local, undefined, null, locales || [])),
      sealos_cloud_domain
    }
  };
}
