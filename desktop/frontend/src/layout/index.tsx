import { createMasterAPP, masterApp, EVENT_NAME } from 'sealos-desktop-sdk';
import { Background } from 'components/background';
import styles from './index.module.scss';
import Taskbar from 'components/taskbar';
import DesktopContent from 'components/desktop_content';
import Head from 'next/head';
import useAppStore from 'stores/app';
import { useEffect } from 'react';
import StartMenu from 'components/start_menu';
import useSessionStore from 'stores/session';
import { Nunito } from '@next/font/google';

const nunito = Nunito({ subsets: ['latin'] });

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
    createMasterAPP();
    masterApp.addEventListen(EVENT_NAME.GET_APPS, async (data) => {
      console.log('receive', data);
      const res = await new Promise((resolve) => {
        setTimeout(() => {
          resolve(['app1', 'app2', '...']);
        }, 1000);
      });
      return {
        reply: 'i am master. i replyt apps',
        data: res
      };
    });
    return masterApp.init({
      session
    });
  }, [session]);

  return (
    <>
      <Head>
        <title>sealos Cloud</title>
        <meta name="description" content="sealos cloud dashboard" />
      </Head>
      <div className={(styles.desktopContainer, nunito.className)}>
        <Background />
        <DesktopContent />
        <Taskbar />
        <StartMenu />
      </div>
    </>
  );
}
