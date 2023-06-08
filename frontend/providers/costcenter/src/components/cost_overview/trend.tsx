import { Heading, Box, Flex } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { memo } from 'react';
const LineChart = dynamic(() => import('./components/lineChart'), { ssr: false });

export const Trend = memo(function Trend() {
  const { t } = useTranslation();
  return (
    <Box>
      <Flex justify={'space-between'} align={'center'}>
        <Heading size={'sm'}> {t('Cost Trend')} </Heading>
      </Flex>
      <LineChart></LineChart>
    </Box>
  );
});
