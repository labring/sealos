import React, { useMemo } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { useGlobalStore } from '@/store/global';
import { useTranslation } from 'next-i18next';

const PriceBox = ({
  cpu,
  memory,
  storage,
  gpu,
  pods = [1, 1]
}: {
  cpu: number;
  memory: number;
  storage: number;
  gpu?: {
    type: string;
    amount: number;
  };
  pods: [number, number];
}) => {
  const { t } = useTranslation();
  const { userSourcePrice } = useGlobalStore();

  const priceList = useMemo(() => {
    if (!userSourcePrice) return [];
    const cpuP = +((userSourcePrice.cpu * cpu * 24) / 1000).toFixed(2);
    const memoryP = +((userSourcePrice.memory * memory * 24) / 1024).toFixed(2);
    const storageP = +(userSourcePrice.storage * storage * 24).toFixed(2);

    const gpuP = (() => {
      if (!gpu) return 0;
      const item = userSourcePrice?.gpu?.find((item) => item.type === gpu.type);
      if (!item) return 0;
      return +(item.price * gpu.amount * 24).toFixed(2);
    })();

    const totalP = +(cpuP + memoryP + storageP + gpuP).toFixed(2);

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
      ...(userSourcePrice?.gpu ? [{ label: 'GPU', color: '#8172D8', value: podScale(gpuP) }] : []),
      { label: 'TotalPrice', color: '#485058', value: podScale(totalP) }
    ];
  }, [cpu, gpu, memory, pods, storage]);

  return (
    <Box>
      <Box>
        <strong>{t('AnticipatedPrice')}</strong> ({t('Perday')})
      </Box>
      {priceList.map((item) => (
        <Flex key={item.label} alignItems={'center'} mt={3}>
          <Box
            flexShrink={0}
            bg={item.color}
            w={'8px'}
            h={'8px'}
            borderRadius={'10px'}
            mr={2}
          ></Box>
          <Box flex={'0 0 60px'}>{t(item.label)}:</Box>
          <Box whiteSpace={'nowrap'}>{item.value}</Box>
        </Flex>
      ))}
      <Box></Box>
    </Box>
  );
};

export default PriceBox;
