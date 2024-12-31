import Notfound from '@/components/notFound';
import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import useOverviewStore from '@/stores/overview';
import { PropertiesCost } from '@/types';
import { Box, Flex, HStack, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import SelectRange from '../billing/selectDateRange';
import AppNameMenu from '../menu/AppNameMenu';
import AppTypeMenu from '../menu/AppTypeMenu';
const Chart = dynamic(() => import('./components/pieChart'), {
  ssr: false
});
export const Cost = function Cost() {
  const { t } = useTranslation();
  const startTime = useOverviewStore((state) => state.startTime);
  const endTime = useOverviewStore((state) => state.endTime);
  const { getNamespace, getAppName, getAppType, getRegion } = useBillingStore();
  const query = {
    namespace: getNamespace()?.[0] || '',
    appType: getAppType(),
    appName: getAppName(),
    regionUid: getRegion()?.uid || '',
    startTime,
    endTime
  };
  const { data, isInitialLoading, isFetching } = useQuery({
    queryKey: ['billing', 'properties', 'costs', query],
    queryFn: () => {
      return request.post<PropertiesCost>('/api/billing/costDistrube', query);
    },
    select(data) {
      const _data = data.data;
      return [_data['0'], _data['1'], _data['2'], _data['3'], _data['4'], _data['5']];
    }
  });
  return (
    <Flex direction={'column'} flex={1} align={'center'}>
      <Flex alignItems={'center'} justify={'space-between'} alignSelf={'flex-start'} mb={'40px'}>
        <Text color={'grayModern.900'} mb={'5px'}>
          {t('Cost Distribution')}
        </Text>
      </Flex>
      <Box>
        <Flex align={'center'} mb="16px" mr={'40px'}>
          <Text fontSize={'12px'} width={'80px'}>
            {t('APP Type')}
          </Text>
          <AppTypeMenu isDisabled={isFetching} />
        </Flex>
        <Flex align={'center'} mb="16px">
          <Text fontSize={'12px'} minW={'80px'} width={'80px'}>
            {t('app_name')}
          </Text>
          <AppNameMenu isDisabled={isFetching} />
        </Flex>
        <Flex align={'center'} mb="16px" mr={'40px'}>
          <Text fontSize={'12px'} width={'80px'}>
            {t('Transaction Time')}
          </Text>
          <HStack gap={'8px'} w="360px">
            <SelectRange isDisabled={isFetching} width={'360px'} />
          </HStack>
        </Flex>
      </Box>

      {isInitialLoading || !data ? (
        <Flex justify={'center'} align={'center'} flex={1}>
          <Notfound></Notfound>
        </Flex>
      ) : (
        <Chart data={data || [0, 0, 0, 0, 0, 0]} appName={getAppName()}></Chart>
      )}
    </Flex>
  );
};
