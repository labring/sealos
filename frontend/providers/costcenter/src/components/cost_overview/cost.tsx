import { Flex, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import Notfound from '@/components/notFound';
import { useQuery } from '@tanstack/react-query';
import useOverviewStore from '@/stores/overview';
import request from '@/service/request';
import { PropertiesCost } from '@/types';
const Chart = dynamic(() => import('./components/pieChart'), {
  ssr: false
});
export const Cost = function Cost() {
  const { t } = useTranslation();
  const startTime = useOverviewStore((state) => state.startTime);
  const endTime = useOverviewStore((state) => state.endTime);
  const { data, isInitialLoading } = useQuery({
    queryKey: ['billing', 'properties', 'costs', { startTime, endTime }],
    queryFn: () => {
      return request.post<PropertiesCost>('/api/billing/propertiesUsedAmount', {
        startTime,
        endTime
      });
    },
    select(data) {
      const _data = data.data.amount;
      return {
        cpu: _data.cpu || 0,
        memory: _data.memory || 0,
        storage: _data.storage || 0,
        network: _data.network || 0,
        gpu: _data.gpu || 0,
        port: _data['services.nodeports'] || 0
      };
    }
  });
  return (
    <Flex direction={'column'} flex={1}>
      <Flex alignItems={'center'} justify={'space-between'}>
        <Text color={'#747F88'} mb={'5px'}>
          {t('Cost Distribution')}
        </Text>
      </Flex>
      {isInitialLoading || !data ? (
        <Flex justify={'center'} align={'center'} flex={1}>
          <Notfound></Notfound>
        </Flex>
      ) : (
        <Chart data={data}></Chart>
      )}
    </Flex>
  );
};
