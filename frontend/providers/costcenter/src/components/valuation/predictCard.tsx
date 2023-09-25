import useBillingStore from '@/stores/billing';
import useEnvStore from '@/stores/env';
import { displayMoney } from '@/utils/format';
import { Box, Flex, Img, Stack, Text } from '@chakra-ui/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import CurrencySymbol from '../CurrencySymbol';
import { valuationMap } from '@/constants/payment';
export default function PredictCard() {
  const { t } = useTranslation();
  const state = useBillingStore();
  const currency = useEnvStore((s) => s.currency);
  const gpuEnabled = useEnvStore((state) => state.gpuEnabled);
  const leastCost = useMemo(() => {
    const origin = [
      { name: 'CPU', cost: state.cpu },
      { name: 'Memory', cost: state.memory },
      { name: 'Storage', cost: state.storage },
      { name: 'Network', cost: state.network }
    ];
    if (!gpuEnabled) {
      origin.push({ name: 'Total Amount', cost: state.cpu + state.memory + state.storage });
    } else {
      origin.push(
        { name: 'GPU', cost: state.gpu },
        { name: 'Total Amount', cost: state.cpu + state.memory + state.storage + state.gpu }
      );
    }
    return origin.map((item) => ({
      ...item,
      cost: displayMoney(item.cost * 30 * 24),
      color: valuationMap.get(item.name.toLocaleLowerCase())?.bg || 'black'
    }));
  }, [state.cpu, state.memory, state.storage, gpuEnabled]);
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
