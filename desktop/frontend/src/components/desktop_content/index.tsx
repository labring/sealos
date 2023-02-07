import { useState, useCallback, useMemo, MouseEvent, useRef } from 'react';
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
  const {
    installedApps: apps,
    openedApps,
    openApp,
    updateAppOrder,
    updateAppsMousedown
  } = useAppStore((state) => state);

  /* icon orders */
  const itemsLen = 18 * 8; // x:18, y:8
  const gridItems = useMemo(
    () =>
      new Array(itemsLen).fill(null).map((_, i) => {
        const app = apps.find((item) => item.order === i);
        return !!app ? { ...app } : null;
      }),
    [apps, itemsLen]
  );
  /* dragging icon */
  const [downingItemIndex, setDowningItemIndex] = useState<number>();

  const isBrowser = typeof window !== 'undefined';
  const DesktopDom = useMemo(
    () => (isBrowser ? document.getElementById('desktop') : null),
    [isBrowser]
  );
  const desktopWidth = DesktopDom?.offsetWidth || 0;
  const desktopHeight = DesktopDom?.offsetHeight || 0;

  const lastDownIconTime = useRef({ appName: '', time: Date.now() });

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

  const onDrop = useCallback(
    (e: any, i: number) => {
      setDowningItemIndex(undefined);
      const dom: Element = e.target;
      /* if it doesnot contain "app-item", it drop in a appGrid */
      if (!dom.classList.contains('app-item')) return;

      if (downingItemIndex === undefined || gridItems[downingItemIndex] === null) return;

      // @ts-ignore nextline
      updateAppOrder(gridItems[downingItemIndex], i);
    },
    [downingItemIndex, gridItems, updateAppOrder]
  );

  /**
   * click a app. if app is "mouseDowning", open it. Otherwise add "mouseDowing" to it.
   */
  const onclickDesktop = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      /* find app target */
      let target = e.target as Element;
      while (target && target !== e.currentTarget && !target?.classList.contains('app')) {
        target = target?.parentElement as Element;
      }

      const app = apps.find((item) => item.name === target.getAttribute('data-app'));

      /* target is app */
      if (!!app) {
        updateAppsMousedown(app, true);

        /* double click, open app */
        if (
          lastDownIconTime.current.appName === app.name &&
          Date.now() - lastDownIconTime.current.time < 500
        ) {
          openApp(app);
        }

        lastDownIconTime.current = {
          appName: app.name,
          time: Date.now()
        };
      } else {
        // target is blank
        updateAppsMousedown(apps[0], false);
      }
    },
    [apps, openApp, updateAppsMousedown]
  );

  return (
    <div id="desktop" className={styles.desktop}>
      {/* 已安装的应用 */}
      <div className={styles.desktopCont} onClick={onclickDesktop}>
        {gridItems.map((item, i: number) => {
          return (
            <div
              key={i}
              className={`app-item ${styles.dskItem}`}
              draggable={i === downingItemIndex}
              onMouseDown={() => item && setDowningItemIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, i)}
            >
              {!!item ? (
                <div
                  className={`app ${styles.dskApp} ${item.mouseDowning ? styles.active : ''}`}
                  data-app={item.name}
                >
                  <div className={`${styles.dskIcon}`}>
                    <AppIcon className={clsx('prtclk')} src={item.icon} width="100%" />
                  </div>
                  <div className={styles.appName}>{item.name}</div>
                </div>
              ) : null}
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
