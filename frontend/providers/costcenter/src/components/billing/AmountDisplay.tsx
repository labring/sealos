import { useQuery } from '@tanstack/react-query';
import request from '@/service/request';
import { deFormatMoney, formatMoney } from '@/utils/format';
import { useTranslation } from 'next-i18next';
import { Text, Box, Flex } from '@chakra-ui/react';
import CurrencySymbol from '@/components/CurrencySymbol';
import useOverviewStore from '@/stores/overview';
import useBillingStore from '@/stores/billing';

export default function AmountDisplay() {
  const startTime = useOverviewStore((s) => s.startTime);
  const endTime = useOverviewStore((s) => s.endTime);
  const { namespace, appType } = useBillingStore();
  const { data, isSuccess } = useQuery({
    queryKey: ['billing', 'buget', { startTime, endTime, appType, namespace }],
    queryFn: () => {
      return request.post<{ amount: number }[]>('/api/billing/buget', {
        startTime,
        endTime,
        appType,
        namespace
      });
    }
  });

  const list = [
    {
      bgColor: '#36ADEF',
      title: 'Deduction',
      value: data?.data[0].amount || 0
    },
    {
      bgColor: '#47C8BF',
      title: 'Charge',
      value: data?.data[1].amount || 0
    }
  ] as const;
  const { t } = useTranslation();
  return (
    <Flex gap={'32px'}>
      {list.map((item) => (
        <Flex align={'center'} gap={'8px'} fontSize={'12px'} key={item.title}>
          <Box w="8px" h="8px" bgColor={item.bgColor} borderRadius={'2px'} />
          <Text>{t(item.title)}</Text>
          <CurrencySymbol fontSize={'14px'} />
          <Text>{formatMoney(item.value).toFixed(2)}</Text>
        </Flex>
      ))}
    </Flex>
  );
}
