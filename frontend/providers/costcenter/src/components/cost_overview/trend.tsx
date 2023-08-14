import { Heading, Box, Flex, Img } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import chart7 from '@/assert/Chart7.svg';
import { memo } from 'react';
import Notfound from '@/components/notFound';
import useBillingData from '@/hooks/useBillingData';
import { useQuery } from '@tanstack/react-query';
const LineChart = dynamic(() => import('./components/lineChart'), { ssr: false });

export const Trend = memo(function Trend() {
  const { t } = useTranslation();
  const { data, isInitialLoading } = useBillingData();
  return (
    <Box>
      <Flex justify={'space-between'} align={'center'}>
        <Heading size={'sm'}> {t('Cost Trend')}</Heading>
      </Flex>
      <Flex height="310px" width={'100%'} justify={'center'} align={'center'} direction={'column'}>
        {isInitialLoading || !data?.data?.status.item?.length ? (
          <>
            <Img src={chart7.src}></Img>
            <Notfound></Notfound>
          </>
        ) : (
          <LineChart data={data?.data?.status.item || []}></LineChart>
        )}
      </Flex>
    </Box>
  );
});
