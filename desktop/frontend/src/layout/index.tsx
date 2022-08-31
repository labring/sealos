import { Background } from '@/components/background';
import styles from './index.module.scss';
import Taskbar from '@/components/taskbar';
import DesktopContent from '@/components/desktop_content';
import Head from 'next/head';

export default function Layout({ children }: any) {
  return (
    <>
      <Head>
        <title>Sealos Desktop</title>
        <meta name="description" content="sealos cloud dashboard" />
      </Head>
      <div className={styles.desktopContainer}>
        <Background />
        <DesktopContent />
        <Taskbar />
      </div>
    </>
  );
}
