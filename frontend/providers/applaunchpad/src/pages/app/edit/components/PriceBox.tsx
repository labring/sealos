import React, { useMemo } from 'react';
import { Box, Center, Flex, useTheme } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { Text, Icon } from '@chakra-ui/react';
import { CURRENCY } from '@/store/static';
import { useUserStore } from '@/store/user';
import MyIcon from '@/components/Icon';
import { CurrencySymbol, MyTooltip } from '@sealos/ui';

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
  const { userSourcePrice } = useUserStore();
  const theme = useTheme();

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
      return (
        <Flex alignItems={'center'}>
          <CurrencySymbol type={CURRENCY} />
          <Text ml="4px">{pods[0] === pods[1] ? `${min}` : `${min} ~ ${max}`}</Text>
        </Flex>
      );
    };

    return [
      {
        label: 'CPU',
        color: '#33BABB',
        value: podScale(cpuP)
      },
      { label: 'Memory', color: '#36ADEF', value: podScale(memoryP) },
      { label: 'Storage', color: '#8172D8', value: podScale(storageP) },
      ...(userSourcePrice?.gpu ? [{ label: 'GPU', color: '#89CD11', value: podScale(gpuP) }] : []),
      { label: 'TotalPrice', color: '#485058', value: podScale(totalP) }
    ];
  }, [cpu, gpu, memory, pods, storage, userSourcePrice]);

  return (
    <Box bg={'#FFF'} borderRadius={'md'} border={theme.borders.base}>
      <Flex py={3} px={4} borderBottom={theme.borders.base} gap={'8px'}>
        <Text color={'grayModern.900'} fontWeight={500}>
          {t('AnticipatedPrice')}
        </Text>
        <Text color={'grayModern.500'}> ({t('Perday')})</Text>
      </Flex>
      <Box py={3} px={4}>
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
              :
            </Flex>
            <Box whiteSpace={'nowrap'}>{item.value}</Box>
          </Flex>
        ))}
      </Box>
    </Box>
  );
};

export default PriceBox;
