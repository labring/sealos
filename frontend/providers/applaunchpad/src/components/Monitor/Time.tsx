import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
export default function DynamicTime() {
  const [time, setTime] = useState('--:--:--');

  useEffect(() => {
    setTime(dayjs().format('HH:mm:ss'));
    const timer = setInterval(() => {
      setTime(dayjs().format('HH:mm:ss'));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return <span>{time}</span>;
}
