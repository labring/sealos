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
    <Icon
      xmlns="http://www.w3.org/2000/svg"
      width="14px"
      height="14px"
      viewBox="0 0 20 20"
      fill="none"
    >
      <circle cx="10" cy="10" r="9.66" fill="#E8E8E8" stroke="#37383A" strokeWidth="0.68" />
      <circle cx="9.99995" cy="10" r="8.7366" fill="#CFCFCF" />
      <path
        d="M10.0001 18.7366C14.8252 18.7366 18.7367 14.8251 18.7367 10C18.7367 8.01946 18.0776 6.19283 16.9669 4.72746C16.4078 4.64858 15.8365 4.60779 15.2557 4.60779C8.98439 4.60779 3.82381 9.36328 3.18328 15.4649C4.78448 17.4596 7.24314 18.7366 10.0001 18.7366Z"
        fill="#BEBEBE"
      />
      <circle cx="10.0001" cy="9.99998" r="6.77549" fill="#828386" />
      <path
        d="M7.20815 9.69376C7.77022 10.5156 8.93312 10.4426 8.93312 10.4426C8.6424 10.1606 8.45342 9.90286 8.43404 9.16859C8.41466 8.43431 7.99795 8.23981 7.99795 8.23981C8.74415 7.76812 8.47765 7.25754 8.45342 6.6886C8.43889 6.33362 8.64724 6.07103 8.81199 5.92029C7.86377 6.06283 7.00696 6.56717 6.4202 7.32816C5.83343 8.08915 5.56198 9.04805 5.66245 10.005C5.73028 9.81533 6.68968 8.93517 7.20815 9.69376Z"
        fill="#E8E8E8"
      />
      <path
        d="M14.0936 8.23012C14.0685 8.1502 14.0378 8.07219 14.0015 7.99671V7.99184C13.8324 7.64657 13.552 7.36876 13.2059 7.20348C12.8597 7.03819 12.468 6.99513 12.0944 7.08126C11.7208 7.1674 11.3871 7.37769 11.1475 7.67803C10.9079 7.97836 10.7765 8.35112 10.7745 8.73584C10.7745 8.85683 10.7875 8.97747 10.8132 9.09568C10.8133 9.0973 10.8133 9.09892 10.8132 9.10054C10.8229 9.14917 10.8374 9.1978 10.852 9.24642C10.9385 9.58898 10.9553 9.9455 10.9015 10.2947C10.8476 10.6439 10.7242 10.9787 10.5387 11.279C10.3531 11.5793 10.1091 11.8391 9.82133 12.0427C9.53354 12.2463 9.20783 12.3896 8.86362 12.4641C8.51942 12.5386 8.16378 12.5428 7.81795 12.4763C7.47211 12.4099 7.14315 12.2742 6.85072 12.0774C6.55828 11.8805 6.30836 11.6266 6.11587 11.3307C5.92338 11.0348 5.79226 10.703 5.73035 10.3551C5.8179 10.9581 6.03066 11.536 6.35486 12.0512C6.67905 12.5665 7.10745 13.0077 7.61233 13.3462C8.1172 13.6848 8.68729 13.9132 9.28569 14.0166C9.88409 14.12 10.4975 14.0962 11.0861 13.9466C11.6747 13.797 12.2255 13.5251 12.7028 13.1483C13.18 12.7716 13.5732 12.2985 13.8567 11.7596C14.1402 11.2207 14.3078 10.6281 14.3486 10.0201C14.3894 9.41211 14.3025 8.80228 14.0936 8.23012Z"
        fill="#E8E8E8"
      />
      <path
        d="M13.3715 9.40197C13.3715 11.5209 11.6599 13.2387 9.54846 13.2387C8.42782 13.2387 7.41979 12.7548 6.72052 11.9838C6.76288 12.0163 6.80636 12.0475 6.85072 12.0774C7.14315 12.2742 7.47211 12.4099 7.81795 12.4763C8.16378 12.5428 8.51942 12.5386 8.86362 12.4641C9.20783 12.3896 9.53354 12.2463 9.82133 12.0427C10.1091 11.8391 10.3531 11.5793 10.5387 11.279C10.7242 10.9787 10.8476 10.6439 10.9015 10.2947C10.9553 9.9455 10.9385 9.58898 10.852 9.24642C10.8374 9.1978 10.8229 9.14917 10.8132 9.10054C10.8133 9.09892 10.8133 9.0973 10.8132 9.09568C10.7875 8.97747 10.7745 8.85683 10.7745 8.73584C10.7765 8.35112 10.9079 7.97836 11.1475 7.67803C11.3871 7.37769 11.7208 7.1674 12.0944 7.08126C12.2485 7.04573 12.4056 7.03213 12.5614 7.04008C13.069 7.69125 13.3715 8.51116 13.3715 9.40197Z"
        fill="#E8E8E8"
      />
      <path
        d="M13.5419 3.49261L13.9409 4.20878L14.6571 4.60778L13.9409 5.00678L13.5419 5.72294L13.1429 5.00678L12.4268 4.60778L13.1429 4.20878L13.5419 3.49261Z"
        fill="#F0F0F0"
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
        <Flex alignItems={'center'}>
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
    <Box bg={'#FFF'} borderRadius={'md'} border={theme.borders.base}>
      <Flex py={3} px={4} borderBottom={theme.borders.base} gap={'8px'}>
        <Text color={'grayModern.900'} fontWeight={500}>
          {t('AnticipatedPrice')}
        </Text>
        <Text color={'grayModern.500'}> ({t('Perday')})</Text>
      </Flex>
      <Box py={3} px={4}>
        {priceList.map((item) => (
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
            <Box flex={'0 0 60px'}>{t(item.label)}:</Box>
            <Box whiteSpace={'nowrap'}>{item.value}</Box>
          </Flex>
        ))}
      </Box>
    </Box>
  );
};

export default PriceBox;
