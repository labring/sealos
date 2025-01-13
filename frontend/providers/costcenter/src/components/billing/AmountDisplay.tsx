import CurrencySymbol from '@/components/CurrencySymbol';
import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import useEnvStore from '@/stores/env';
import useOverviewStore from '@/stores/overview';
import { formatMoney } from '@/utils/format';
import { Box, Flex, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';

export default function AmountDisplay({ onlyOut = false }: { onlyOut?: boolean }) {
  const { startTime, endTime } = useOverviewStore();
  const { currency } = useEnvStore();
  const { getNamespace, getAppType, getRegion, getAppName } = useBillingStore();
  const rechargeQueryBody = {
    startTime,
    endTime
  };
  const expenditureQueryBody = {
    appType: getAppType(),
    namespace: getNamespace()?.[0] || '',
    startTime,
    endTime,
    regionUid: getRegion()?.uid || '',
    appName: getAppName()
  };
  const { data: expenditureData, isSuccess: expenditureIsSuccess } = useQuery({
    queryKey: ['consumption', expenditureQueryBody],
    queryFn: () => {
      return request.post<{ amount: number }>('/api/billing/consumption', expenditureQueryBody);
    }
  });
  const { data: rechargeData, isSuccess: rechargeIsSuccess } = useQuery({
    queryKey: ['recharge', rechargeQueryBody],
    queryFn: () => {
      return request.post<{ amount: number }>('/api/billing/recharge', rechargeQueryBody);
    },
    enabled: !onlyOut
  });
  // const { data } = useQuery({})
  const list = useMemo(() => {
    const list = [
      {
        bgColor: 'blue.600',
        title: 'Total Expenditure',
        value: expenditureData?.data.amount || 0
      }
    ];
    if (!onlyOut)
      list.push({
        bgColor: 'teal.500',
        title: 'Total Recharge',
        value: rechargeData?.data.amount || 0
      });
    return list;
  }, [onlyOut, rechargeData, expenditureData]);
  const { t } = useTranslation();
  return (
    <Flex gap={'32px'}>
      {list.map((item) => (
        <Flex align={'center'} gap={'8px'} fontSize={'12px'} key={item.title}>
          <Box w="8px" h="8px" bgColor={item.bgColor} borderRadius={'2px'} />
          <Text>{t(item.title)}: </Text>
          <CurrencySymbol fontSize={'14px'} type={currency} />
          <Text>{formatMoney(item.value).toFixed(2)}</Text>
        </Flex>
      ))}
    </Flex>
  );
}
