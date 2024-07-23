import { SOURCE_PRICE } from '@/store/static';
import { I18nCommonKey } from '@/types/i18next';
import { Box, Flex, useTheme, Text } from '@chakra-ui/react';
import { SealosCoin } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';

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
  const theme = useTheme();
  const { t } = useTranslation();
  const priceList: {
    label: I18nCommonKey;
    color: string;
    value: string;
  }[] = useMemo(() => {
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
        ? `${val[0].toFixed(2)}`
        : `${val[0].toFixed(2)} ~ ${val[1].toFixed(2)}`;
    };

    return [
      {
        label: 'cpu',
        color: '#33BABB',
        value: podScale(cp)
      },
      { label: 'memory', color: '#36ADEF', value: podScale(mp) },
      { label: 'storage', color: '#8172D8', value: podScale(sp) },
      { label: 'total_price', color: '#485058', value: podScale(tp) }
    ];
  }, [components]);

  return (
    <Box bg={'#FFF'} borderRadius={'md'} border={theme.borders.base}>
      <Flex py={3} px={'20px'} borderBottom={theme.borders.base} gap={'8px'}>
        <Text color={'grayModern.900'} fontWeight={500}>
          {t('anticipated_price')}
        </Text>
        <Text color={'grayModern.500'}> ({t('Perday')})</Text>
      </Flex>
      <Flex flexDirection={'column'} gap={'12px'} py={'16px'} px={'20px'}>
        {priceList.map((item) => (
          <Flex key={item.label} alignItems={'center'}>
            <Box bg={item.color} w={'8px'} h={'8px'} borderRadius={'10px'} mr={2}></Box>
            <Box flex={'0 0 65px'}>{t(item.label)}:</Box>
            <Flex alignItems={'center'} gap={'4px'}>
              <SealosCoin />
              {item.value}
            </Flex>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
};

export default PriceBox;
