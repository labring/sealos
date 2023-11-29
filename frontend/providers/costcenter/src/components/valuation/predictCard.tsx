import useBillingStore from '@/stores/billing';
import useEnvStore from '@/stores/env';
import { displayMoney, formatMoney } from '@/utils/format';
import { Box, Flex, Stack, Text, filter } from '@chakra-ui/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import CurrencySymbol from '../CurrencySymbol';
import { END_TIME, valuationMap } from '@/constants/payment';
import useBillingData from '@/hooks/useBillingData';
import { BillingType, Costs } from '@/types';
import { isSameDay, isSameHour, parseISO } from 'date-fns';
export default function PredictCard() {
  const { t } = useTranslation();
  const { data } = useBillingData({ type: BillingType.CONSUME, endTime: END_TIME });
  const _state = useMemo<Costs & { total: number }>(() => {
    const items = data?.data?.status.item || [];
    if (items.length > 0) {
      const latest = items[0];
      const time = parseISO(latest.time);
      const now = new Date();
      if (isSameDay(time, now) && isSameHour(time, now))
        return {
          ...latest.costs,
          total: latest.amount
        };
    }
    return {
      cpu: 0,
      memory: 0,
      storage: 0,
      network: 0,
      port: 0,
      total: 0
    };
  }, [data?.data?.status.item]);
  const currency = useEnvStore((s) => s.currency);
  const gpuEnabled = useEnvStore((state) => state.gpuEnabled);
  const leastCost = useMemo(() => {
    const state = Object.fromEntries(Object.entries(_state).map(([k, v]) => [k, formatMoney(v)]));
    const origin = [
      { name: 'CPU', cost: state.cpu },
      { name: 'Memory', cost: state.memory },
      { name: 'Storage', cost: state.storage },
      { name: 'Network', cost: state.network },
      { name: 'Port', cost: state.port }
    ];
    if (!gpuEnabled) {
      origin.push({ name: 'Total Amount', cost: state.total });
    } else {
      origin.push(
        { name: 'GPU', cost: state.gpu ?? 0 },
        { name: 'Total Amount', cost: state.total }
      );
    }
    return origin.map((item) => ({
      ...item,
      cost: displayMoney(item.cost * 30 * 24),
      color: valuationMap.get(item.name.toLocaleLowerCase())?.bg || 'black'
    }));
  }, [_state, gpuEnabled]);
  return (
    <Stack gap="20px" fontSize={'12px'}>
      {leastCost.map((item) => (
        <Flex key={item.name} flex={1} align={'center'} w="full" justify={'flex-start'}>
          <Flex align={'center'} w="100px">
            <Box borderRadius={'full'} bgColor={item.color} w="8px" h="8px" mr="8px" />
            <Text>{t(item.name)}</Text>
          </Flex>
          <Flex align={'center'}>
            <CurrencySymbol w="14px" type={currency} mr="6px" color={'#5A646E'} />
            <Text>{item.cost}</Text>
          </Flex>
        </Flex>
      ))}
    </Stack>
  );
}
