import clsx from 'clsx';
import React from 'react';
import useAppStore from 'stores/app';
import AppIcon from '../app_icon';
import AppWindow from '../app_window';
import styles from './index.module.scss';

export default function DesktopContent() {
  const { apps, opendApps, currentApp, openApp } = useAppStore((state) => state);

  return (
    <div className={styles.desktop}>
      <div className={styles.desktopCont}>
        {apps.map((appItem: any, i: number) => {
          return (
            <div
              key={i}
              className={styles.dskApp}
              tabIndex={0}
              onClick={() => {
                openApp(appItem);
              }}
            >
              <AppIcon
                className={clsx(styles.dskIcon, 'prtclk')}
                src={appItem.icon}
                payload={'full'}
                width={36}
              />
              <div className={styles.appName}>{appItem.name}</div>
            </div>
          );
        })}
      </div>

      {opendApps.map((appItem: any) => {
        return (
          <AppWindow key={appItem.name} style={{ height: '100vh' }} app={appItem}>
            <iframe
              src={appItem.data.url}
              allow="camera;microphone"
              className="w-full h-full"
              frameBorder={0}
            />
          </AppWindow>
        );
      })}
    </div>
  );
}
