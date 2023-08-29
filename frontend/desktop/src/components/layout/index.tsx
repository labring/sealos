import Head from 'next/head';
import styles from './index.module.scss';

export default function Layout(props: any) {
  return (
    <>
      <Head>
        <title>sealos Cloud</title>
        <meta name="description" content="sealos cloud dashboard" />
      </Head>
      <div className={styles.desktopContainer}>{props.children}</div>
    </>
  );
}
