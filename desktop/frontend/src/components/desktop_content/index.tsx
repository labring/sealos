import AppStore from 'applications/app_store';
import Infra from 'applications/infra';
import PgSql from 'applications/pgsql';

import clsx from 'clsx';
import { APPTYPE } from 'constants/app_type';
import useAppStore, { TApp } from 'stores/app';
import AppIcon from '../app_icon';
import AppWindow from '../app_window';
import IframeApp from './iframe_app';
import styles from './index.module.scss';

export default function DesktopContent() {
  const { installedApps: apps, openedApps, currentApp, openApp } = useAppStore((state) => state);
  const isBrowser = typeof window !== 'undefined';
  const desktopWidth = isBrowser ? document.getElementById('desktop')?.offsetWidth || 0 : 0;
  const desktopHeight = isBrowser ? document.getElementById('desktop')?.offsetHeight || 0 : 0;

  function renderApp(appItem: TApp) {
    switch (appItem.type) {
      case APPTYPE.APP:
        if (appItem.name === 'sealos cloud provider') {
          return <Infra />;
        }
        if (appItem.name === 'Postgres') {
          return <PgSql />;
        }
        return <AppStore />;

      case APPTYPE.IFRAME:
        return <IframeApp appItem={appItem} />;

      default:
        break;
    }
  }

  return (
    <div id="desktop" className={styles.desktop}>
      <div className={styles.desktopCont}>
        {/* 已安装的应用 */}
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
              <AppIcon className={clsx(styles.dskIcon, 'prtclk')} src={appItem.icon} width={36} />
              <div className={styles.appName}>{appItem.name}</div>
            </div>
          );
        })}
      </div>

      {/* 打开的应用窗口 */}
      {openedApps.map((appItem) => {
        return (
          <AppWindow
            key={appItem.name}
            style={{ height: '100vh' }}
            app={appItem}
            desktopWidth={desktopWidth}
            desktopHeight={desktopHeight}
          >
            {renderApp(appItem)}
          </AppWindow>
        );
      })}
    </div>
  );
}
