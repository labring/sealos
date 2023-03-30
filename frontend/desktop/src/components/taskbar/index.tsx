/* eslint-disable @next/next/no-img-element */
import clsx from 'clsx';
import Icon from 'components/icons';
import useAppStore from '../../stores/app';
import styles from './taskbar.module.scss';
import useLocalSession from 'hooks/useLocalSession';
import TimeZone from './time_zone';
import Iconfont from 'components/iconfont';
import Notification from 'components/notification';
import { useState } from 'react';

const Taskbar = () => {
  const { openedApps, currentApp, switchApp, toggleStartMenu } = useAppStore((state) => state);
  const { localSession } = useLocalSession();
  const [showNotification, setShowNotification] = useState(false);
  const [notificationAmount, setNotificationAmount] = useState(0);

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
        <div
          className={clsx('flex items-center relative cursor-pointer')}
          onClick={() => setShowNotification(!showNotification)}
        >
          <Iconfont
            iconName="icon-feNoticeActive2"
            color={showNotification ? '#436790' : '#ffffff'}
            width={20}
            height={20}
          />
          <div className={styles.notification} data-show={showNotification}>
            {notificationAmount || ''}
          </div>
        </div>
        {showNotification && (
          <Notification
            isShow={showNotification}
            onClose={() => setShowNotification(false)}
            onAmount={(amount) => setNotificationAmount(amount)}
          />
        )}

        <TimeZone />

        <Icon className={clsx(styles.graybd, 'my-4')} width={6} />
      </div>
    </div>
  );
};

export default Taskbar;
