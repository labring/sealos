import DesktopContent from '@/components/desktop_content';
import FloatButton from '@/components/floating_button';
import Layout from '@/components/layout';
import MoreApps from '@/components/more_apps';
import { enableRecharge } from '@/services/enable';
import useAppStore from '@/stores/app';
import useSessionStore from '@/stores/session';
import { parseOpenappQuery } from '@/utils/format';
import { useColorMode } from '@chakra-ui/react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { createContext, useEffect, useState } from 'react';
const destination = '/signin';
interface IMoreAppsContext {
  showMoreApps: boolean;
  setShowMoreApps: (value: boolean) => void;
}
export const MoreAppsContext = createContext<IMoreAppsContext | null>(null);
export const RechargeEnabledContext = createContext<boolean>(false);
export default function Home({ rechargeEnabled }: { rechargeEnabled: boolean }) {
  const router = useRouter();
  const isUpdate = useSessionStore((s) => s.newUser);
  const { colorMode, toggleColorMode } = useColorMode();
  const isUserLogin = useSessionStore((s) => s.isUserLogin);
  const init = useAppStore((state) => state.init);
  const setAutoLaunch = useAppStore((state) => state.setAutoLaunch);
  const cancelAutoLaunch = useAppStore((state) => state.cancelAutoLaunch);
  useEffect(() => {
    colorMode === 'dark' ? toggleColorMode() : null;
  }, [colorMode, toggleColorMode]);
  const [showMoreApps, setShowMoreApps] = useState(false);
  useEffect(() => {
    const { query } = router;
    const is_login = isUserLogin();
    if (!isUpdate || !is_login) {
      const { appkey, appQuery } = parseOpenappQuery((query?.openapp as string) || '');
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

  return {
    props: {
      ...(await serverSideTranslations(local, undefined, null, locales || [])),
      rechargeEnabled: enableRecharge()
    }
  };
}
