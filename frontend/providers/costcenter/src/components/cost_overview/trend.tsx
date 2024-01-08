import { Heading, Box, Flex, Img } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import chart7 from '@/assert/Chart7.svg';
import { memo } from 'react';
import Notfound from '@/components/notFound';
import useOverviewStore from '@/stores/overview';
import { useQuery } from '@tanstack/react-query';
import request from '@/service/request';
const LineChart = dynamic(() => import('./components/lineChart'), { ssr: false });

export const Trend = memo(function Trend() {
  const { t } = useTranslation();
  const startTime = useOverviewStore((state) => state.startTime);
  const endTime = useOverviewStore((state) => state.endTime);
  const { data, isInitialLoading } = useQuery({
    queryKey: ['billing', 'trend', { startTime, endTime }],
    queryFn: () => {
      return request.post<{ costs: [number, string][] }>('/api/billing/costs', {
        startTime,
        endTime
      });
    }
  });
  return (
    <Box>
      <Flex justify={'space-between'} align={'center'}>
        <Heading size={'sm'}> {t('Cost Trend')}</Heading>
      </Flex>
      <Flex height="310px" width={'100%'} justify={'center'} align={'center'} direction={'column'}>
        {isInitialLoading || !data ? (
          <>
            <Img src={chart7.src}></Img>
            <Notfound></Notfound>
          </>
        ) : (
          <LineChart data={data?.data?.costs || []}></LineChart>
        )}
      </Flex>
    </Box>
  );
});
