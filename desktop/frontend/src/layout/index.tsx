import { Background } from 'components/background';
import styles from './index.module.scss';
import Taskbar from 'components/taskbar';
import DesktopContent from 'components/desktop_content';
import Head from 'next/head';
import useAppStore from 'stores/app';
import { useEffect } from 'react';
import StartMenu from 'components/start_menu';

import MasterSDK from 'sealos-desktop-sdk/master';
import useSessionStore from 'stores/session';

export default function Layout({ children }: any) {
  const { init } = useAppStore((state) => state);
  const session = useSessionStore((s) => s.session);

  useEffect(() => {
    (async () => {
      // Initialize, get user information, install application information, etc.
      await init();
    })();
  }, [init]);

  useEffect(() => {
    if (!window) {
      return;
    }
    const sdk = new MasterSDK(session);
    sdk.init();
  }, [session]);

  return (
    <>
      <Head>
        <title>sealos Cloud</title>
        <meta name="description" content="sealos cloud dashboard" />
      </Head>
      <div className={styles.desktopContainer}>
        <Background />
        <DesktopContent />
        <Taskbar />
        <StartMenu />
      </div>
    </>
  );
}
