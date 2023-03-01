/* eslint-disable @next/next/no-img-element */
import clsx from 'clsx';
import Icon from 'components/icons';
import useAppStore from '../../stores/app';
import styles from './taskbar.module.scss';

import useLocalSession from 'hooks/useLocalSession';
import TimeZone from './time_zone';

const Taskbar = () => {
  const { openedApps, currentApp, switchApp, toggleStartMenu } = useAppStore((state) => state);

  const { localSession } = useLocalSession();

  return (
    <div className={styles.taskbar}>
      <div className="flex items-center">
        <div
          className="ml-2"
          onClick={() => {
            toggleStartMenu();
          }}
        >
          <img
            width={36}
            height={36}
            src={localSession?.user?.avatar}
            alt=""
            className={styles.avatar}
          />
        </div>
      </div>
      <div className={styles.tsbar}>
        {/* <div className={clsx(styles.tsIcon)}>
          <Icon src="search" width={24} />
        </div> */}

        {/* <div className={clsx(styles.tsIcon)}>
          <Icon src="settings" width={24} />
        </div> */}

        {openedApps.map((item, index) => {
          return (
            <div
              onClick={() => {
                switchApp({ ...item, mask: false });
              }}
              key={index}
              className={clsx({
                [styles.tsIcon]: true,
                [styles.opened]: true,
                [styles.actived]: item.name === currentApp?.name && currentApp?.size !== 'minimize'
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
        <TimeZone />

        <Icon className={clsx(styles.graybd, 'my-4')} width={6} />
      </div>
    </div>
  );
};

export default Taskbar;
