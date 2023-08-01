import { Flex, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { memo } from 'react';
import Notfound from '@/components/notFound';
import useBillingData from '@/hooks/useBillingData';
const Chart = dynamic(() => import('./components/pieChart'), {
  ssr: false
});
export const Cost = memo(function Cost() {
  const { t } = useTranslation();
  const { data, isInitialLoading } = useBillingData();
  const _deduction = data?.data?.status.deductionAmount;
  const deductionAmount = {
    cpu: _deduction?.cpu || 0,
    memory: _deduction?.memory || 0,
    storage: _deduction?.storage || 0,
    gpu: _deduction?.gpu || 0
  };
  return (
    <Flex direction={'column'} flex={1}>
      <Flex alignItems={'center'} justify={'space-between'}>
        <Text color={'#747F88'} mb={'5px'}>
          {t('Cost Distribution')}
        </Text>
      </Flex>
      {isInitialLoading || !_deduction ? (
        <Flex justify={'center'} align={'center'} flex={1}>
          <Notfound></Notfound>
        </Flex>
      ) : (
        <Chart data={deductionAmount}></Chart>
      )}
    </Flex>
  );
});
