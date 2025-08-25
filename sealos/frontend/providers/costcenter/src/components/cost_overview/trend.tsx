import chart7 from '@/assert/Chart7.svg';
import Notfound from '@/components/notFound';
import request from '@/service/request';
import { Box, Divider, Flex, Heading, Img } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { subDays } from 'date-fns';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { memo, useMemo, useState } from 'react';
const LineChart = dynamic(() => import('./components/lineChart'), { ssr: false });

export const Trend = memo(function Trend() {
  const { t, i18n } = useTranslation();
  // const startTime = useOverviewStore((state) => state.startTime);
  // const endTime = useOverviewStore((state) => state.endTime);
  const [endTime] = useState(() => new Date());
  const startTime = subDays(endTime, 7);
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
  const arr = useMemo(
    () =>
      (data?.data || []).map<[[number, string][], string]>((v) => [
        v[0],
        i18n.language === 'zh' ? v[1].zh : v[1].en
      ]),
    [data?.data, i18n.language]
  );
  return (
    <Box w={'full'}>
      <Flex align={'center'} gap={'10px'}>
        <Heading color="grayModern.900" size={'sm'}>
          {' '}
          {t('Cost Trend')}
        </Heading>
        <Divider
          orientation={'vertical'}
          borderColor={'grayModern.500'}
          bgColor={'grayModern.500'}
          h={'14px'}
          borderWidth={'1px'}
        />
        <Heading size={'sm'} color={'grayModern.500'}>
          {t('Last 7 days')}
        </Heading>
      </Flex>
      <Flex height="310px" width={'full'} justify={'center'} align={'center'} direction={'column'}>
        {isInitialLoading || !data ? (
          <>
            <Img src={chart7.src}></Img>
            <Notfound></Notfound>
          </>
        ) : (
          <LineChart data={arr} cycle={'Day'} startTime={startTime} endTime={endTime}></LineChart>
        )}
      </Flex>
    </Box>
  );
});
