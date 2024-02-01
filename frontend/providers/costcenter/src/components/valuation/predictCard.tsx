import useBillingStore from '@/stores/billing';
import useEnvStore from '@/stores/env';
import { displayMoney, formatMoney } from '@/utils/format';
import { Box, Flex, Stack, Text, filter } from '@chakra-ui/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { END_TIME, valuationMap } from '@/constants/payment';
import useBillingData from '@/hooks/useBillingData';
import { BillingType, Costs } from '@/types';
import { isSameDay, isSameHour, parseISO, subHours } from 'date-fns';

export default function PredictCard() {
  const { t } = useTranslation();
  const NOW_TIME = new Date();

  const { data } = useBillingData({
    type: BillingType.CONSUME,
    endTime: NOW_TIME,
    startTime: subHours(NOW_TIME, 3)
  });
  const _state = useMemo<Costs & { total: number }>(() => {
    let times = 3;
    const items = data?.data?.status.item || [];
    let state = {
      cpu: 0,
      memory: 0,
      storage: 0,
      network: 0,
      port: 0,
      gpu: 0,
      total: 0
    };
    while (times--) {
      let existSame = false;
      items.reduce((pre, cur) => {
        const time = parseISO(cur.time);
        if (
          isSameDay(time, subHours(NOW_TIME, 3 - times)) &&
          isSameHour(time, subHours(NOW_TIME, 3 - times))
        ) {
          pre.cpu += cur.costs.cpu;
          pre.memory += cur.costs.memory;
          pre.storage += cur.costs.storage;
          pre.network += cur.costs.network;
          pre.port += cur.costs.port;
          pre.gpu += cur.costs.gpu || 0;
          pre.total += cur.amount;
          existSame = true;
        }
        return pre;
      }, state);
      if (existSame) break;
    }
    return state;
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
            <Text>{item.cost}</Text>
          </Flex>
        </Flex>
      ))}
    </Stack>
  );
}
