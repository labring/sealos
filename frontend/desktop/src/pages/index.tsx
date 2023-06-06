import Layout from '@/components/layout';
import { useRouter } from 'next/router';
import { createContext, useEffect, useState } from 'react';
import useSessionStore from '@/stores/session';
import { useColorMode } from '@chakra-ui/react';
import useAppStore from '@/stores/app';
import DesktopContent from '@/components/desktop_content';
import FloatButton from '@/components/floating_button';
import dynamic from 'next/dynamic';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
const destination = '/signin';
const MoreApps = dynamic(() => import('@/components/more_apps'), {
  ssr: false
});
interface IMoreAppsContext {
  showMoreApps: boolean;
  setShowMoreApps: (value: boolean) => void;
}
export const MoreAppsContext = createContext<IMoreAppsContext | null>(null);
export default function Home(props: any) {
  const router = useRouter();
  const { colorMode, toggleColorMode } = useColorMode();
  const isUserLogin = useSessionStore((s) => s.isUserLogin);
  const init = useAppStore((state) => state.init);
  useEffect(() => {
    colorMode === 'dark' ? toggleColorMode() : null;
  }, [colorMode, toggleColorMode]);
  const [showMoreApps, setShowMoreApps] = useState(false);
  useEffect(() => {
    const is_login = isUserLogin();
    if (!is_login && router.pathname !== destination && router.asPath !== destination) {
      router.replace(destination);
    } else {
      init();
    }
  }, [router, isUserLogin, init]);

  return <Layout>
    <MoreAppsContext.Provider value={{ showMoreApps, setShowMoreApps }}>
      <DesktopContent />
      <FloatButton />
      <MoreApps />
    </MoreAppsContext.Provider>


  </Layout>;
};

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serverSideTranslations(content.locale))
    }
  };
}
