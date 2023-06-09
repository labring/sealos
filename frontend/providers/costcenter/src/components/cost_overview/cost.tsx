import { Flex, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { memo } from 'react';
const Chart = dynamic(() => import('./components/pieChart'), {
  ssr: false
});
export const Cost = memo(function Cost() {
  const { t } = useTranslation();
  return (
    <Flex direction={'column'}>
      <Flex alignItems={'center'} justify={'space-between'}>
        <Text color={'#747F88'} mb={'5px'}>
          {t('Cost Distribution')}
        </Text>
      </Flex>
      <Chart></Chart>
    </Flex>
  );
});
