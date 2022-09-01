import AppStore from 'applications/app_store';
import clsx from 'clsx';
import { APPTYPE } from 'constants/app_type';
import React from 'react';
import useAppStore from 'stores/app';
import AppIcon from '../app_icon';
import AppWindow from '../app_window';
import IframApp from './iframe_app';
import styles from './index.module.scss';

export default function DesktopContent() {
  const { installedApps: apps, opendApps, currentApp, openApp } = useAppStore((state) => state);

  function renderApp(appItem: any) {
    switch (appItem.type) {
      case APPTYPE.APP:
        return <AppStore />;

      case APPTYPE.IFRAME:
        return <IframApp appItem={appItem} />;

      default:
        break;
    }
  }

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

      {opendApps.map((appItem) => {
        return (
          <AppWindow key={appItem.name} style={{ height: '100vh' }} app={appItem}>
            {renderApp(appItem)}
          </AppWindow>
        );
      })}
    </div>
  );
}
