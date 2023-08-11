import DesktopContent from '@/components/desktop_content';
import FloatButton from '@/components/floating_button';
import Layout from '@/components/layout';
import MoreApps from '@/components/more_apps';
import { enableRecharge } from '@/services/enable';
import request from '@/services/request';
import useAppStore from '@/stores/app';
import useSessionStore from '@/stores/session';
import { ApiResp } from '@/types';
import { SystemConfigType } from '@/types/system';
import { parseOpenappQuery } from '@/utils/format';
import { useColorMode } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import Script from 'next/script';
import { createContext, useEffect, useState } from 'react';
const destination = '/signin';
interface IMoreAppsContext {
  showMoreApps: boolean;
  setShowMoreApps: (value: boolean) => void;
}
export const MoreAppsContext = createContext<IMoreAppsContext | null>(null);
export const RechargeEnabledContext = createContext<boolean>(false);

export default function Home({
  rechargeEnabled,
  sealos_cloud_domain
}: {
  rechargeEnabled: boolean;
  sealos_cloud_domain: string;
}) {
  const router = useRouter();
  const isUpdate = useSessionStore((s) => s.newUser);
  const { colorMode, toggleColorMode } = useColorMode();
  const isUserLogin = useSessionStore((s) => s.isUserLogin);
  const init = useAppStore((state) => state.init);
  const setAutoLaunch = useAppStore((state) => state.setAutoLaunch);
  const cancelAutoLaunch = useAppStore((state) => state.cancelAutoLaunch);

  const { data: systemConfig, refetch } = useQuery(['getSystemConfig'], () =>
    request<any, ApiResp<SystemConfigType>>('/api/system/getSystemConfig')
  );

  useEffect(() => {
    colorMode === 'dark' ? toggleColorMode() : null;
  }, [colorMode, toggleColorMode]);
  const [showMoreApps, setShowMoreApps] = useState(false);

  useEffect(() => {
    const { query } = router;
    const is_login = isUserLogin();
    const whitelistApps = ['system-fastdeploy'];

    if (!isUpdate || !is_login) {
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
  }, [router, isUserLogin, init, isUpdate, setAutoLaunch]);

  return (
    <Layout>
      {systemConfig?.data?.scripts?.map((item, i) => {
        return <Script key={i} {...item} />;
      })}
      <MoreAppsContext.Provider value={{ showMoreApps, setShowMoreApps }}>
        <RechargeEnabledContext.Provider value={rechargeEnabled}>
          <DesktopContent />
          <FloatButton />
          <MoreApps />
        </RechargeEnabledContext.Provider>
      </MoreAppsContext.Provider>
    </Layout>
  );
}

export async function getServerSideProps({ req, res, locales }: any) {
  const local = req?.cookies?.NEXT_LOCALE || 'en';
  const sealos_cloud_domain = process.env.SEALOS_CLOUD_DOMAIN || 'cloud.sealos.io';

  return {
    props: {
      ...(await serverSideTranslations(local, undefined, null, locales || [])),
      rechargeEnabled: enableRecharge(),
      sealos_cloud_domain
    }
  };
}
