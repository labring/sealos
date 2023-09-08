import React, { useMemo } from 'react';
import { Box, Flex, useTheme } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { Text, Icon } from '@chakra-ui/react';
import { CURRENCY } from '@/store/static';
import { useUserStore } from '@/store/user';

function Currencysymbol({
  type = 'shellCoin',
  ...props
}: {
  type?: 'shellCoin' | 'cny' | 'usd';
} & Pick<Parameters<typeof Icon>[0], 'w' | 'h' | 'color'>) {
  return type === 'shellCoin' ? (
    <Icon h="auto" {...props} viewBox="0 0 43 43">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M38.8452 16.3383C38.8452 16.3383 38.169 13.0791 34.6177 12.5018C34.6177 12.5018 32.91 5.22138 26.476 8.01336C26.476 8.01336 21.7775 1.34481 16.7833 8.01336C16.7833 8.01336 10.8267 4.86984 8.35511 12.513C8.35511 12.513 4.03522 12.6233 4.00011 18.5272C3.96499 24.4311 12.4728 30.8168 13.6867 31.3741C13.6867 31.3741 11.0158 34.2719 14.2876 36.284C18.8172 38.6577 27.3756 37.7936 29.4606 35.9326C30.7532 34.7789 30.6523 33.0064 29.4606 31.5498C29.4556 31.5548 40.4202 25.1038 38.8452 16.3383ZM31.6228 11.4841C29.9736 8.80397 26.7453 10.5751 26.7453 10.5751C27.9505 20.3212 24.1256 29.8479 24.1256 29.8479C27.7512 28.7132 33.6121 14.7169 31.6228 11.4841ZM21.1951 7.66792C21.1951 7.66792 18.5641 7.83387 18.1203 11.4413C17.6764 15.0488 18.7299 29.0557 21.5427 30.0673C21.5427 30.0673 23.5266 30.5865 24.8902 18.319C26.6924 6.40218 21.1951 7.66792 21.1951 7.66792ZM16.2936 10.5751C16.2936 10.5751 13.488 8.61467 11.4786 11.4841C9.49465 14.7169 15.3556 28.7132 18.9759 29.8479C18.9759 29.8479 15.2143 21.3388 16.2936 10.5751ZM8.87726 14.9454C8.87726 14.9454 6.13705 14.9454 6.43049 18.7633C6.79949 23.5643 12.9309 28.6588 15.2143 29.5044C15.2089 29.5044 10.0763 22.326 8.87726 14.9454ZM15.1097 34.6383C15.8744 35.9813 24.6742 36.3866 28.102 34.8719C28.102 34.8719 29.1783 33.7787 27.532 31.5994C27.4731 31.5216 26.8769 31.5791 26.5874 31.5627C26.2978 31.5463 26.0133 31.4758 25.6763 31.4068C25.6763 31.4068 24.6168 32.1662 22.9437 31.5994C22.9437 31.5994 21.7614 32.2601 20.3823 31.5994C20.3823 31.5994 18.6756 32.1821 17.6497 31.4068C17.6497 31.4068 16.9291 31.6032 15.8719 31.4068C15.8719 31.4068 14.3671 33.3342 15.1097 34.6383ZM34.2051 14.9533C32.8914 23.1395 27.9505 29.5113 27.9505 29.5113C30.9382 28.8784 36.0244 22.5811 36.6816 18.7633C37.3388 14.9454 34.2051 14.9533 34.2051 14.9533Z"
      />
    </Icon>
  ) : type === 'cny' ? (
    <Text {...props}>￥</Text>
  ) : (
    <Text {...props}>$</Text>
  );
}
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
        <Flex>
          <Currencysymbol type={CURRENCY} />
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
    <Box>
      <Box py={3} px={4} borderBottom={theme.borders.base}>
        <strong>{t('AnticipatedPrice')}</strong> ({t('Perday')})
      </Box>
      <Box py={3} px={4}>
        {priceList.map((item) => (
          <Flex key={item.label} alignItems={'center'} _notFirst={{ mt: 3 }}>
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
      </Box>
    </Box>
  );
};

export default PriceBox;
