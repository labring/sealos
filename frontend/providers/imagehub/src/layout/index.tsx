import useSessionStore from '@/stores/session';
import { Nunito } from '@next/font/google';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app';
import styles from './index.module.scss';
const nunito = Nunito({ subsets: ['latin'] });

export default function Layout({ children }: any) {
  const { setSession } = useSessionStore();
  const [isLodaing, setIsLoading] = useState(true);
  useEffect(() => {
    return createSealosApp();
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        const result = await sealosApp.getUserInfo();
        setSession(result);
      } catch (error) {}
      setIsLoading(false);
    };

    initApp();
  }, [isLodaing, setSession]);

  return (
    <div className={clsx(styles.desktopContainer, nunito.className)}>
      {isLodaing ? (
        <div className={'w-full h-full flex items-center justify-center'}>loading</div>
      ) : (
        <div className={clsx(styles.backgroundWrap, 'w-full h-full')}>{children}</div>
      )}
    </div>
  );
}
