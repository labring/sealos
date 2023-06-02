import { Background } from '@/components/background';
import DesktopContent from '@/components/desktop_content';
import FloatButton from '@/components/floating_button';
import useAppStore from '@/stores/app';
import Head from 'next/head';
import { createContext, useEffect, useState } from 'react';
import styles from './index.module.scss';
import MoreApps from '@/components/more_apps';
interface IMoreAppsContext {
  showMoreApps: boolean;
  setShowMoreApps: (value: boolean) => void;
}
export const MoreAppsContext = createContext<IMoreAppsContext | null>(null);

export default function Layout(props: any) {
  const { init } = useAppStore((state) => state);
  const [showMoreApps, setShowMoreApps] = useState(false);
  useEffect(() => {
    (async () => {
      // Initialize, get user information, install application information, etc.
      await init();
    })();
  }, [init]);

  return (
    <>
      <Head>
        <title>sealos Cloud</title>
        <meta name="description" content="sealos cloud dashboard" />
      </Head>
      <MoreAppsContext.Provider value={{ showMoreApps, setShowMoreApps }}>
        <div className={styles.desktopContainer}>
          <Background />
          <DesktopContent />
          <FloatButton />
          <MoreApps />
        </div>
      </MoreAppsContext.Provider>
    </>
  );
}
