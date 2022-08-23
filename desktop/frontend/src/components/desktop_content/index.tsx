import Setting from 'applications/setting';
import clsx from 'clsx';
import React from 'react';
import SunIcon from '../icons/SunIcon';
import defaultApps from './deskApps';
import styles from './index.module.scss';

export default function DesktopContent() {
  const deskApps = defaultApps;

  return (
    <div className={styles.desktop}>
      <div className={styles.desktopCont}>
        {!deskApps.hide &&
          deskApps.apps.map((app, i) => {
            return (
              <div key={i} className={styles.dskApp} tabIndex={0}>
                <SunIcon
                  click={app.action}
                  className={clsx(styles.dskIcon, 'prtclk')}
                  src={app.icon}
                  payload={app.payload || 'full'}
                  pr
                  width={Math.round(deskApps.size * 36)}
                  menu="app"
                />
                <div className={styles.appName}>{app.name}</div>
              </div>
            );
          })}
      </div>
      <Setting />
    </div>
  );
}
