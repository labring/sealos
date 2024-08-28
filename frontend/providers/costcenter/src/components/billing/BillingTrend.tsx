import chart7 from '@/assert/Chart7.svg';
import Notfound from '@/components/notFound';
import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import useOverviewStore from '@/stores/overview';
import { Box, Flex, Heading, Img } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { memo, useMemo } from 'react';
const LineChart = dynamic(() => import('./BillingLineChart'), { ssr: false });

export const BillingTrend = memo(function Trend() {
  const { t, i18n } = useTranslation();
  const { getCycle } = useBillingStore();
  const { startTime, endTime } = useOverviewStore();
  const { getAppName, getRegion, getAppType, getNamespace } = useBillingStore();
  const regionUid = getRegion()?.uid || '';
  const queryBody = {
    endTime,
    startTime,
    regionUid,
    appType: getAppType(),
    appName: getAppName(),
    namespace: getNamespace()?.[0] || ''
  };
  const { data, isInitialLoading } = useQuery({
    queryKey: ['billing', 'trend', queryBody],
    queryFn: () => {
      return request.post<[number, string][]>('/api/billing/regionCost', queryBody);
    }
  });

  const arr = useMemo(() => data?.data || [], [data?.data]);
  return (
    <Box w={'full'}>
      <Flex align={'center'} gap={'5px'}>
        <Heading size={'sm'} color={'grayModern.900'}>
          {t('Cost Trend')}
        </Heading>
      </Flex>
      <Flex height="200px" width={'100%'} justify={'center'} align={'center'} direction={'column'}>
        {isInitialLoading || !data ? (
          <>
            <Img src={chart7.src}></Img>
            <Notfound></Notfound>
          </>
        ) : (
          <LineChart data={arr} cycle={getCycle()}></LineChart>
        )}
      </Flex>
    </Box>
  );
});
