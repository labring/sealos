import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Box } from '@chakra-ui/react';

export default function DynamicTime() {
  const [time, setTime] = useState('--:--:--');

  useEffect(() => {
    setTime(dayjs().format('HH:mm:ss'));
    const timer = setInterval(() => {
      setTime(dayjs().format('HH:mm:ss'));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return <Box>{time}</Box>;
}
