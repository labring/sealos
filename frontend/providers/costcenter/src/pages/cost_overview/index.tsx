import bar_icon from '@/assert/bar_chart_4_bars_black.svg';
import SelectRange from '@/components/billing/selectDateRange';
import useNotEnough from '@/hooks/useNotEnough';
import { Box, Flex, Heading, HStack, Img, Text, useToast } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { MutableRefObject, createContext, useEffect, useRef } from 'react';
import { Buget } from '@/components/cost_overview/buget';
import UserCard from '@/components/cost_overview/components/user';
import { Cost } from '@/components/cost_overview/cost';
import { Trend } from '@/components/cost_overview/trend';
import useBillingData from '@/hooks/useBillingData';
import NotFound from '@/components/notFound';
import { useRouter } from 'next/router';
import useOverviewStore from '@/stores/overview';
import { CommonBillingTable } from '@/components/billing/billingTable';
import { QueryClient } from '@tanstack/react-query';
import request from '@/service/request';
import CurrencySymbol from '@/components/CurrencySymbol';
import useEnvStore from '@/stores/env';

const getProperties = () => request.post('/api/billing/propertiesUsedAmount');

export const RechargeContext = createContext<{ rechargeRef: MutableRefObject<any> | null }>({
  rechargeRef: null
});

function CostOverview() {
  const { t } = useTranslation();
  const setRecharge = useOverviewStore((s) => s.setRecharge);
  const router = useRouter();
  useEffect(() => {
    const { stripeState } = router.query;
    if (stripeState === 'success') {
      totast({
        status: 'success',
        duration: 3000,
        title: t('Stripe Success'),
        isClosable: true,
        position: 'top'
      });
    } else if (stripeState === 'error') {
      totast({
        status: 'error',
        duration: 3000,
        title: t('Stripe Cancel'),
        isClosable: true,
        position: 'top'
      });
    }
    !!stripeState && router.replace(router.pathname);
  }, []);
  useEffect(() => {
    const { openRecharge } = router.query;
    if (openRecharge === 'true') {
      router.replace(router.pathname);
      setRecharge(1);
    }
  }, []);
  const { NotEnoughModal } = useNotEnough();
  const { data, isInitialLoading } = useBillingData({ pageSize: 3 });
  const billingItems = data?.data?.status.item.filter((v) => v.type === 0) || [];
  const totast = useToast();
  const rechargeRef = useRef<any>();
  const currency = useEnvStore((s) => s.currency);
  return (
    <RechargeContext.Provider value={{ rechargeRef }}>
      <Flex h={'100%'}>
        <Flex
          bg="white"
          p="24px"
          borderRadius="8px"
          direction="column"
          flexGrow={'1'}
          flex={'1'}
          overflowY={'auto'}
        >
          <Flex wrap={'wrap'}>
            <Flex mb={'24px'} mr="24px" align={'center'}>
              <Img src={bar_icon.src} w={'24px'} h={'24px'} mr="18px"></Img>
              <Heading size="lg">{t('SideBar.CostOverview')} </Heading>
            </Flex>
            <Box mb={'24px'}>
              <SelectRange isDisabled={false}></SelectRange>
            </Box>
          </Flex>

          <Flex flexDirection={'column'} flex={'auto'}>
            <Box borderRadius="12px" display={['block', 'block', 'block', 'none']}>
              <Flex direction={['column', 'column', 'row', 'row']} justify={'space-between'}>
                <Box alignSelf={'center'}>
                  <UserCard />
                </Box>
                <Buget></Buget>
              </Flex>
              <Cost></Cost>
            </Box>
            <Trend></Trend>
            <Flex direction={'column'} h={'0'} flex={[1, null, null, 'auto']}>
              <HStack h={'auto'} gap={'12px'} mb={'36px'}>
                <Heading fontWeight={'500'} size={'sm'} verticalAlign={'middle'} display={'flex'}>
                  {t('Recent Transactions')}
                </Heading>
                <Text fontSize={'12px'}>
                  ({t('currencyUnit')}:{' '}
                  <CurrencySymbol type={currency} boxSize={'14px'} verticalAlign={'middle'} /> )
                </Text>
              </HStack>
              <CommonBillingTable data={billingItems} isOverview={true} />
              {(isInitialLoading || billingItems.length === 0) && (
                <Flex h="160px" justify={'center'} align={'center'}>
                  <NotFound></NotFound>
                </Flex>
              )}
            </Flex>
          </Flex>
        </Flex>
        <Flex
          flexShrink={0}
          w={'375px'}
          h="100%"
          pt={'24px'}
          px={'24px'}
          overflowY="auto"
          overflowX={'hidden'}
          display={['none', 'none', 'none', 'flex']}
          direction={'column'}
          justify={'flex-start'}
        >
          <UserCard />
          <Buget></Buget>
          <Cost></Cost>
        </Flex>
      </Flex>
      <NotEnoughModal></NotEnoughModal>
    </RechargeContext.Provider>
  );
}

export async function getServerSideProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, undefined, null, ['zh', 'en']))
    }
  };
}

export default CostOverview;
