import clsx from 'clsx';
import React from 'react';
import useAppStore from 'stores/app';
import AppIcon from '../app_icon';
import AppWindow from '../app_window';
import styles from './index.module.scss';

export default function DesktopContent() {
  const { apps } = useAppStore((state) => state);

  return (
    <div className={styles.desktop}>
      <div className={styles.desktopCont}>
        {
          !apps.map((appItem: any, i: number) => {
            return (
              <div key={i} className={styles.dskApp} tabIndex={0}>
                <AppIcon
                  onClick={appItem.action}
                  className={clsx(styles.dskIcon, 'prtclk')}
                  src={appItem.icon}
                  payload={'full'}
                  width={Math.round(appItem.size * 36)}
                />
                <div className={styles.appName}>{appItem.name}</div>
              </div>
            );
          })
        }
      </div>

      <AppWindow style={{ height: '100vh' }} app={apps[0]}>
        <iframe
          src="https://www.sealos.io/docs/category/getting-started"
          allow="camera;microphone"
          className="w-full h-full"
          frameBorder={0}
        />
      </AppWindow>
    </div>
  );
}
