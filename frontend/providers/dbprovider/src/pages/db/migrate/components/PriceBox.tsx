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
  components = []
}: {
  components: {
    cpu: number;
    memory: number;
    storage: number;
    replicas: number[];
  }[];
}) => {
  const { t } = useTranslation();
  const priceList = useMemo(() => {
    let cp = [0, 0];
    let mp = [0, 0];
    let sp = [0, 0];
    let tp = [0, 0];
    components.forEach(({ cpu, memory, storage, replicas }) => {
      const cpuP = (SOURCE_PRICE.cpu * cpu * 24) / 1000;
      const memoryP = (SOURCE_PRICE.memory * memory * 24) / 1024;
      const storageP = SOURCE_PRICE.storage * storage * 24;
      const totalP = cpuP + memoryP + storageP;

      replicas.forEach((item, i) => {
        cp[i] += cpuP * item;
        mp[i] += memoryP * item;
        sp[i] += storageP * item;
        tp[i] += totalP * item;
      });
    });

    const podScale = (val: number[]) => {
      return val[0] === val[1]
        ? `￥${val[0].toFixed(2)}`
        : `￥${val[0].toFixed(2)} ~ ${val[1].toFixed(2)}`;
    };

    return [
      {
        label: 'CPU',
        color: '#33BABB',
        value: podScale(cp)
      },
      { label: 'Memory', color: '#36ADEF', value: podScale(mp) },
      { label: 'Storage', color: '#8172D8', value: podScale(sp) },
      { label: 'Total Price', color: '#485058', value: podScale(tp) }
    ];
  }, [components]);

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
