import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import { formatTime } from 'utils/format';
import styles from './taskbar.module.scss';

export default function TimeZone() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    // const timer = setInterval(() => {
    //   setTime(new Date());
    // }, 1000);

    return () => {
      // clearInterval(timer);
    };
  }, []);

  return (
    <div
      className={clsx(styles.taskDate, 'm-1 handcr prtclk rounded hvlight')}
      data-action="CALNTOGG"
    >
      <div>{formatTime(time, 'HH:mm:ss')}</div>
      <div>
        {time.toLocaleDateString('en-US', {
          year: '2-digit',
          month: '2-digit',
          day: 'numeric'
        })}
      </div>
    </div>
  );
}
