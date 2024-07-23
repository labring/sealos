import { GET } from '@/services/request';
import { DBDetailType } from '@/types/db';
import { formatTimeToDay } from '@/utils/tools';
import { Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { Box, Text } from '@chakra-ui/react';
import { useMemo } from 'react';
import { maxTime } from 'date-fns';
import { DBTypeEnum } from '@/constants/db';
import { useTranslation } from 'next-i18next';

const RunningTime = ({
  db,
  dbName,
  dbType
}: {
  dbName: string;
  dbType: string;
  db?: DBDetailType;
}) => {
  const { t } = useTranslation();
  const { data: RunningTimeData } = useQuery(['getRunningTime'], () =>
    GET('/api/monitor/getRunningTime', { dbName: dbName, dbType: dbType })
  );

  const { data: MysqlInnoDB } = useQuery(
    ['getMysqlInnoDB'],
    () => GET('/api/monitor/getMysqlInnoDB', { dbName: dbName, dbType: dbType }),
    {
      enabled: dbType === DBTypeEnum.mysql
    }
  );

  const MaxTime = useMemo(() => {
    if (!RunningTimeData?.maxRunningTime) return;
    return formatTimeToDay(parseFloat(RunningTimeData?.maxRunningTime));
  }, [RunningTimeData?.maxRunningTime]);

  if (dbType === DBTypeEnum.mysql && MysqlInnoDB) {
    return (
      <Flex justifyContent={'space-between'}>
        <Flex
          w="48%"
          mr="16px"
          justifyContent={'center'}
          alignItems={'center'}
          flexShrink={0}
          h={'80px'}
          p={' 12px 24px'}
          fontSize={'20px'}
          color={'#24282C'}
          fontWeight={500}
          borderRadius={'4px'}
          border={'1px solid #CCEEED'}
          backgroundColor={'rgba(0, 169, 166, 0.07)'}
        >
          {t('running_time')}
          <Box mx={'24px'} w={'1px'} h={'38px'} backgroundColor={'#CCEEED'}></Box>
          <Text fontSize={'40'} color={'#00A9A6'} mr="16px">
            {MaxTime?.time}
          </Text>
          <Text fontSize={'15px'}>{t(MaxTime?.unit || 'start_minute')}</Text>
        </Flex>
        <Flex
          w="48%"
          justifyContent={'center'}
          alignItems={'center'}
          flexShrink={0}
          h={'80px'}
          p={' 12px 24px'}
          fontSize={'20px'}
          color={'#24282C'}
          fontWeight={500}
          borderRadius={'4px'}
          border={'1px solid #D7EFFC'}
          backgroundColor={'rgba(94, 189, 242, 0.10)'}
        >
          {t('innodb_buffer_pool')}
          <Box mx={'24px'} w={'1px'} h={'38px'} backgroundColor={'#CCEEED'}></Box>
          <Text fontSize={'40'} color={'#36ADEF'} mr="16px">
            {MysqlInnoDB?.result?.value}
          </Text>
          <Text fontSize={'15px'}>{t(MysqlInnoDB?.result?.unit)}</Text>
        </Flex>
      </Flex>
    );
  }
  return (
    <Flex
      justifyContent={'center'}
      alignItems={'center'}
      flexShrink={0}
      h={'80px'}
      p={' 12px 24px'}
      fontSize={'20px'}
      color={'#24282C'}
      fontWeight={500}
      borderRadius={'4px'}
      border={'1px solid #CCEEED'}
      backgroundColor={'rgba(0, 169, 166, 0.07)'}
    >
      {t('running_time')}
      <Box mx={'24px'} w={'1px'} h={'38px'} backgroundColor={'#CCEEED'}></Box>
      <Text fontSize={'40'} color={'#00A9A6'} mr="16px">
        {MaxTime?.time}
      </Text>
      <Text fontSize={'15px'}>{t(MaxTime?.unit || 'start_minute')}</Text>
    </Flex>
  );
};

export default RunningTime;
