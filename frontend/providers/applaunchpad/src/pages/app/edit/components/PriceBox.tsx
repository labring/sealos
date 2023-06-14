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

const PriceBox = ({ cpu, memory, storage }: resourcePriceResponse) => {
  const { t } = useTranslation();

  const priceList = useMemo(() => {
    const cpuP = +((SOURCE_PRICE.cpu * cpu * 24) / 1000).toFixed(2);
    const memoryP = +((SOURCE_PRICE.memory * memory * 24) / 1024).toFixed(2);
    const storageP = +(SOURCE_PRICE.storage * storage * 24).toFixed(2);
    const totalP = +(cpuP + memoryP + storageP).toFixed(2);

    return [
      { label: 'CPU', color: '#33BABB', value: cpuP },
      { label: 'Memory', color: '#36ADEF', value: memoryP },
      { label: 'Storage', color: '#8172D8', value: storageP },
      { label: 'TotalPrice', color: '#485058', value: totalP }
    ];
  }, [cpu, memory, storage]);
  return (
    <Box>
      <Box>
        <strong>{t('AnticipatedPrice')}</strong> (1 Pod/{t('Day')})
      </Box>
      {priceList.map((item) => (
        <Flex key={item.label} alignItems={'center'} mt={3}>
          <Box bg={item.color} w={'8px'} h={'8px'} borderRadius={'10px'} mr={2}></Box>
          <Box flex={'0 0 70px'}>{t(item.label)}:</Box>
          <Box>￥{item.value}</Box>
        </Flex>
      ))}
      <Box></Box>
    </Box>
  );
};

export default PriceBox;
