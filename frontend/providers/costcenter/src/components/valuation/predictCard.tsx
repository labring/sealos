import useBillingStore from '@/stores/billing';
import useEnvStore from '@/stores/env';
import { displayMoney } from '@/utils/format';
import { Flex, Img, Text } from '@chakra-ui/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import CurrencySymbol from '../CurrencySymbol';
export default function PredictCard() {
  const { t } = useTranslation();
  const total = t('total');
  const state = useBillingStore();
  const currency = useEnvStore((s) => s.currency);
  const gpuEnabled = useEnvStore((state) => state.gpuEnabled);
  const leastCost = useMemo(() => {
    const origin = [
      { name: 'CPU', cost: state.cpu },
      { name: 'Memory', cost: state.memory },
      { name: 'Storage', cost: state.storage }
    ];
    if (!gpuEnabled) {
      origin.push({ name: total, cost: state.cpu + state.memory + state.storage });
    } else {
      origin.push(
        { name: 'GPU', cost: state.gpu },
        { name: total, cost: state.cpu + state.memory + state.storage + state.gpu }
      );
    }
    return origin.map((item) => ({
      ...item,
      cost: displayMoney(item.cost * 30 * 24)
    }));
  }, [state.cpu, state.memory, state.storage, gpuEnabled, total]);
  return (
    <Flex borderX={'0.5px solid #DEE0E2'}>
      {leastCost.map((item) => (
        <Flex
          key={item.name}
          flex={1}
          position="relative"
          borderX={'0.5px solid #DEE0E2'}
          borderY={'1px solid #DEE0E2'}
          bg={'#F1F4F6'}
          direction={'column'}
        >
          <Flex justify={'center'} align={'center'} h={'42px'} borderBottom={'1px solid #DEE0E2'}>
            {item.name}
          </Flex>
          <Flex justify={'center'} align={'center'} h={'68px'}>
            <CurrencySymbol w="14px" type={currency} />
            <Text>{item.cost}</Text>
          </Flex>
        </Flex>
      ))}
    </Flex>
  );
}
