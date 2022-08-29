import Setting from 'applications/setting';
import clsx from 'clsx';
import React from 'react';
import AppIcon from '../app_icon';
import defaultApps from './deskApps';
import styles from './index.module.scss';

export default function DesktopContent() {
  const deskApps = defaultApps;

  return (
    <div className={styles.desktop}>
      <div className={styles.desktopCont}>
        {!deskApps.hide &&
          deskApps.apps.map((app: any, i) => {
            return (
              <div key={i} className={styles.dskApp} tabIndex={0}>
                <AppIcon
                  onClick={app.action}
                  className={clsx(styles.dskIcon, 'prtclk')}
                  src={app.icon}
                  payload={'full'}
                  width={Math.round(deskApps.size * 36)}
                />
                <div className={styles.appName}>{app.name}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
