import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import { formatTime } from 'utils/format';
import styles from './taskbar.module.scss';

export default function TimeZone() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toString());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <div
      className={clsx(styles.taskDate, 'm-1 handcr prtclk rounded hvlight')}
      data-action="CALNTOGG"
    >
      <div className="text-2xl">{formatTime(time, 'HH:mm')}</div>
      <div className="text-lg">{formatTime(time, 'YYYY年MM月DD日')}</div>
    </div>
  );
}
