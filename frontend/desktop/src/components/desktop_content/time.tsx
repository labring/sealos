import { formatTime } from '@/utils/tools';
import { Flex, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useEffect, useMemo, useState } from 'react';

const WeekDay = {
  Sunday: '周日',
  Monday: '周一',
  Tuesday: '周二',
  Wednesday: '周三',
  Thursday: '周四',
  Friday: '周五',
  Saturday: '周六'
};

export default function TimeComponent(props: any) {
  const [time, setTime] = useState(new Date().toString());
  const { i18n } = useTranslation();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toString());
    }, 10000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const day = useMemo(() => {
    try {
      const temp = formatTime(time, 'dddd') as keyof typeof WeekDay;
      return WeekDay[temp];
    } catch (error) {}
  }, [time]);

  return (
    <Flex
      userSelect={'none'}
      alignItems={'center'}
      justifyContent={'center'}
      flexDirection={'column'}
      w="100%"
      color={'rgba(244, 246, 248, 0.9)'}
    >
      <Text fontWeight={500} fontSize={'64px'} textShadow={'0px 1px 2px rgba(0, 0, 0, 0.4)'}>
        {formatTime(time, 'HH:mm')}
      </Text>
      {i18n.language === 'en' ? (
        <Text fontWeight={500} textShadow={'0px 1px 2px rgba(0, 0, 0, 0.4)'}>
          {formatTime(time, 'YYYY/MM/DD')} {formatTime(time, 'dddd')}
        </Text>
      ) : (
        <Text fontWeight={500} textShadow={'0px 1px 2px rgba(0, 0, 0, 0.4)'}>
          {formatTime(time, 'YYYY年MM月DD日')} {day}
        </Text>
      )}
    </Flex>
  );
}
