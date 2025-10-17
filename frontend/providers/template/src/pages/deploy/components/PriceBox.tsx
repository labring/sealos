import React from 'react';
import { Box, Center, Flex, Divider } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { Text } from '@chakra-ui/react';
import { useUserStore } from '@/store/user';
import MyIcon from '@/components/Icon';
import { CurrencySymbol, MyTooltip } from '@sealos/ui';
import { type ResourceUsage } from '@/utils/usage';
import { PriceIcon } from '@/components/icons/PriceIcon';
import { useSystemConfigStore } from '@/store/config';

export const usePriceCalculation = ({ cpu, memory, storage, nodeport }: ResourceUsage) => {
  const { userSourcePrice } = useUserStore();

  return React.useMemo(() => {
    if (!userSourcePrice) return [];

    const cpuPMin = +((userSourcePrice.cpu * cpu.min * 24) / 1000).toFixed(2);
    const cpuPMax = +((userSourcePrice.cpu * cpu.max * 24) / 1000).toFixed(2);

    const memoryPMin = +((userSourcePrice.memory * memory.min * 24) / 1024).toFixed(2);
    const memoryPMax = +((userSourcePrice.memory * memory.max * 24) / 1024).toFixed(2);

    const storagePMin = +(userSourcePrice.storage * storage.min * 24).toFixed(2);
    const storagePMax = +(userSourcePrice.storage * storage.max * 24).toFixed(2);

    const nodePortP = +(userSourcePrice.nodeports * nodeport * 24).toFixed(2);

    const totalPMin = +(cpuPMin + memoryPMin + storagePMin + nodePortP).toFixed(2);
    const totalPMax = +(cpuPMax + memoryPMax + storagePMax + nodePortP).toFixed(2);

    const formatRange = (min: number, max: number) => (min === max ? `${min}` : `${min} ~ ${max}`);

    return [
      {
        label: 'CPU',
        color: '#13C4B9',
        value: formatRange(cpuPMin, cpuPMax)
      },
      {
        label: 'Memory',
        color: '#219BF4',
        value: formatRange(memoryPMin, memoryPMax)
      },
      {
        label: 'Storage',
        color: '#8774EE',
        value: formatRange(storagePMin, storagePMax)
      },
      {
        label: 'Port',
        color: '#C172E7',
        value: `${nodePortP}`
      },
      {
        label: 'TotalPrice',
        color: '#111824',
        value: formatRange(totalPMin, totalPMax)
      }
    ];
  }, [cpu, memory, storage, nodeport, userSourcePrice]);
};

const PriceBox = (props: ResourceUsage) => {
  const { t } = useTranslation();
  const priceList = usePriceCalculation(props);
  const { envs } = useSystemConfigStore();

  return (
    <Box bg={'#FFF'} borderRadius={'10px'}>
      <Flex pt={'20px'} px={'24px'} flexDirection={'column'}>
        <Flex alignItems={'center'} gap={'8px'}>
          <PriceIcon />
          <Text color={'grayModern.900'} fontWeight={500}>
            {t('AnticipatedPrice')}
          </Text>
          <Text color={'grayModern.500'}> ({t('Perday')})</Text>
        </Flex>
        <Divider my={'12px'} />
      </Flex>
      <Box pb={'24px'} px={'24px'}>
        {priceList.map((item, index) => (
          <Flex
            key={item.label}
            alignItems={'center'}
            _notFirst={{ mt: '12px' }}
            fontSize={'12px'}
            fontWeight={500}
            color={'grayModern.600'}
          >
            <Box
              flexShrink={0}
              bg={item.color}
              w={'8px'}
              h={'8px'}
              borderRadius={'10px'}
              mr={2}
            ></Box>
            <Flex alignItems={'center'} gap={'2px'} flex={'0 0 60px'}>
              {t(item.label)}
              {index === priceList.length - 1 && (
                <MyTooltip label={t('total_price_tip')}>
                  <Center width={'14px'} height={'14px'} cursor={'pointer'}>
                    <MyIcon name="help" width={'14px'} height={'14px'} color={'grayModern.500'} />
                  </Center>
                </MyTooltip>
              )}
            </Flex>
            <Flex ml={'auto'} minW={'45px'} alignItems={'center'} gap={'4px'} whiteSpace={'nowrap'}>
              <CurrencySymbol type={envs?.CURRENCY_SYMBOL} />
              {item.value}
            </Flex>
          </Flex>
        ))}
      </Box>
    </Box>
  );
};

export default PriceBox;
