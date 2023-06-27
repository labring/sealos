import React, { useMemo } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { SOURCE_PRICE } from '@/store/static';
import type { Response as resourcePriceResponse } from '@/pages/api/platform/resourcePrice';
import { useTranslation } from 'next-i18next';

export const colorMap = {
  cpu: '#33BABB',
  memory: '#36ADEF',
  storage: '#8172D8'
};

const PriceBox = ({
  cpu,
  memory,
  storage,
  pods = [1, 1]
}: resourcePriceResponse & { pods: [number, number] }) => {
  const { t } = useTranslation();

  const priceList = useMemo(() => {
    const cpuP = +((SOURCE_PRICE.cpu * cpu * 24) / 1000).toFixed(2);
    const memoryP = +((SOURCE_PRICE.memory * memory * 24) / 1024).toFixed(2);
    const storageP = +(SOURCE_PRICE.storage * storage * 24).toFixed(2);
    const totalP = +(cpuP + memoryP + storageP).toFixed(2);

    const podScale = (val: number) => {
      const min = (val * pods[0]).toFixed(2);
      const max = (val * pods[1]).toFixed(2);
      return pods[0] === pods[1] ? `￥${min}` : `￥${min} ~ ${max}`;
    };

    return [
      {
        label: 'CPU',
        color: '#33BABB',
        value: podScale(cpuP)
      },
      { label: 'Memory', color: '#36ADEF', value: podScale(memoryP) },
      { label: 'Storage', color: '#8172D8', value: podScale(storageP) },
      { label: 'Total Price', color: '#485058', value: podScale(totalP) }
    ];
  }, [cpu, memory, pods, storage]);

  return (
    <Box>
      <Box>
        <strong>{t('Anticipated Price')}</strong> ({t('Perday')})
      </Box>
      {priceList.map((item) => (
        <Flex key={item.label} alignItems={'center'} mt={3}>
          <Box bg={item.color} w={'8px'} h={'8px'} borderRadius={'10px'} mr={2}></Box>
          <Box flex={'0 0 65px'}>{t(item.label)}:</Box>
          <Box>{item.value}</Box>
        </Flex>
      ))}
      <Box></Box>
    </Box>
  );
};

export default PriceBox;
