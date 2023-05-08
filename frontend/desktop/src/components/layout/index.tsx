import { Background } from '@/components/background';
import DesktopContent from '@/components/desktop_content';
import FloatButton from '@/components/floating_button';
import useAppStore from '@/stores/app';
import Head from 'next/head';
import { useEffect } from 'react';
import styles from './index.module.scss';

export default function Layout(props: any) {
  const { init } = useAppStore((state) => state);

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
      <div className={styles.desktopContainer}>
        <Background />
        <DesktopContent />
        <FloatButton />
      </div>
    </>
  );
}
