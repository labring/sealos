import chart7 from '@/assert/Chart7.svg';
import Notfound from '@/components/notFound';
import request from '@/service/request';
import { Box, Divider, Flex, Heading, Img } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { subMonths } from 'date-fns';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { memo, useMemo, useState } from 'react';
const BarChart = dynamic(() => import('./components/barChart'), { ssr: false });

export const TrendBar = memo(function Trend() {
  const { t, i18n } = useTranslation();
  // const startTime = useOverviewStore((state) => state.startTime);
  // const endTime = useOverviewStore((state) => state.endTime);
  const [endTime] = useState(() => new Date());
  const startTime = subMonths(endTime, 6);
  const { data, isInitialLoading } = useQuery({
    queryKey: ['billing', 'trend', { startTime, endTime }],
    queryFn: () => {
      return request.post<
        [
          [number, string][],
          {
            en: string;
            zh: string;
          }
        ][]
      >('/api/billing/costs', {
        startTime,
        endTime
      });
    }
  });
  const { data: rechareData } = useQuery({
    queryKey: ['billing', 'trend', 'recharge', { startTime, endTime }],
    queryFn: () => {
      return request.post<[number, number][]>('/api/billing/rechargeList', {
        startTime,
        endTime
      });
    }
  });
  const totalArr = useMemo(
    () =>
      (data?.data ? data.data[0][0] : []).map<[number, string]>(([date, val]) => [
        date * 1000,
        val
      ]),
    [data?.data]
  );
  const rechargeArr = rechareData?.data || [];
  const inOutData: [[number, string | number][], string][] = [
    [totalArr, t('Total Expenditure')],
    [rechargeArr, t('Total Recharge')]
  ];
  return (
    <Box bg="White">
      <Flex align={'center'} gap={'10px'} fontSize={'500'}>
        <Heading size={'sm'} color={'grayModern.900'}>
          {t('Annual Income and Expenditure')}
        </Heading>
        <Divider
          orientation={'vertical'}
          borderColor={'grayModern.500'}
          bgColor={'grayModern.500'}
          h={'14px'}
          borderWidth={'1px'}
        />
        <Heading size={'sm'} color={'grayModern.500'}>
          {t('Last 6 Months')}
        </Heading>
        <Divider
          orientation={'vertical'}
          borderColor={'grayModern.500'}
          bgColor={'grayModern.500'}
          h={'14px'}
          borderWidth={'1px'}
        />
        <Heading size={'sm'} color={'grayModern.500'}>
          {' '}
          {t('All Regions')}
        </Heading>
      </Flex>

      <Flex height="310px" width={'100%'} justify={'center'} align={'center'} direction={'column'}>
        {isInitialLoading || !data ? (
          <>
            <Img src={chart7.src}></Img>
            <Notfound></Notfound>
          </>
        ) : (
          <BarChart data={inOutData} startTime={startTime} endTime={endTime} />
        )}
      </Flex>
    </Box>
  );
});
