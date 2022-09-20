import clsx from 'clsx';
import Battery from 'components/battery';
import Icon from 'components/icons';
import { useEffect, useState } from 'react';
import useAppStore from '../../stores/app';
import useSessionStore from '../../stores/session';
import styles from './taskbar.module.scss';

import Sealos from '../../assets/icons/sealos.svg';

const Taskbar = () => {
  const clickDispatch = (event: any) => {
    var action = {
      type: event.target.dataset.action,
      payload: event.target.dataset.payload
    };

    if (action.type) {
      // dispatch(action);
    }
  };

  const {
    installedApps: apps,
    openedApps,
    currentApp,
    openApp,
    updateAppInfo,
    switchApp
  } = useAppStore((state) => state);

  const session = useSessionStore((s) => s.session);
  const [avatar, setAvatar] = useState('');
  useEffect(() => {
    if (session.user.avatar) {
      setAvatar(session.user.avatar);
    }
  }, [session]);

  return (
    <div className={styles.taskbar}>
      <div className="flex items-center">
        <div className={clsx(styles.tsIcon)}>
          {/* <Icon src="widget" width={24} /> */}
          <img width={24} height={24} src={avatar} alt="" />
        </div>
      </div>
      <div className={styles.tsbar}>
        <div className={clsx(styles.tsIcon)}>
          {/* <Icon src="home" width={24} /> */}
          <Sealos width={24} height={24} alt="" />
        </div>
        <div className={clsx(styles.tsIcon)}>
          <Icon src="github" width={24} />
        </div>

        <div className={clsx(styles.tsIcon)}>
          <Icon src="search" width={24} />
        </div>

        <div className={clsx(styles.tsIcon)}>
          <Icon src="settings" width={24} />
        </div>

        {openedApps.map((item, index) => {
          return (
            <div
              onClick={() => {
                switchApp(item);
              }}
              key={index}
              className={clsx({
                [styles.tsIcon]: true,
                [styles.opened]: true,
                [styles.actived]: item.name === currentApp?.name
              })}
            >
              <Icon src={item.icon} width={24} ext />
            </div>
          );
        })}
      </div>

      <div className={styles.taskright}>
        <div>
          <Icon width={10} />
        </div>
        {/* <div
          className="prtclk handcr my-1 px-1 hvlight items-center flex rounded"
          onClick={clickDispatch}
          data-action="PANETOGG"
        >
          <Icon className="mr-1" src="wifi" width={16} />
          <Battery />
        </div> */}

        <div
          className={clsx(styles.taskDate, 'm-1 handcr prtclk rounded hvlight')}
          onClick={clickDispatch}
          data-action="CALNTOGG"
        >
          <div>
            {new Date().toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: 'numeric'
            })}
          </div>
          <div>
            {new Date().toLocaleDateString('en-US', {
              year: '2-digit',
              month: '2-digit',
              day: 'numeric'
            })}
          </div>
        </div>
        <Icon className={clsx(styles.graybd, 'my-4')} width={6} />
      </div>
    </div>
  );
};

export default Taskbar;
