import { Buget } from '@/components/cost_overview/buget';
import GiftCode from '@/components/cost_overview/components/GiftCode';
import UserCard from '@/components/cost_overview/components/user';
import { Trend } from '@/components/cost_overview/trend';
import { TrendBar } from '@/components/cost_overview/trendBar';
import useNotEnough from '@/hooks/useNotEnough';
import request from '@/service/request';
import useEnvStore from '@/stores/env';
import useOverviewStore from '@/stores/overview';
import useRechargeStore from '@/stores/recharge';
import { ApiResp } from '@/types';
import { gtmTopupSuccess } from '@/utils/gtm';
import { Box, Flex, useToast } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { MutableRefObject, createContext, useEffect, useRef } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';
export const RechargeContext = createContext<{ rechargeRef: MutableRefObject<any> | null }>({
  rechargeRef: null
});

function CostOverview() {
  const { t } = useTranslation();
  const setRecharge = useOverviewStore((s) => s.setRecharge);
  const router = useRouter();
  const toast = useToast();
  const { i18nIsInitialized } = useEnvStore();
  const { resetProcess, amount, paid, isProcess } = useRechargeStore();

  useEffect(() => {
    (async () => {
      const lng = ((await sealosApp.getLanguage())?.lng || 'en') as 'en' | 'zh';
      const { stripeState } = router.query;
      if (!i18nIsInitialized || !router.isReady || !stripeState) return;
      if (stripeState === 'success') {
        isProcess &&
          gtmTopupSuccess({
            amount,
            paid
          });
        toast({
          status: 'success',
          duration: 3000,
          title: t('Stripe Success', {
            lng
          }),
          isClosable: true,
          position: 'top'
        });
      } else if (stripeState === 'error') {
        toast({
          status: 'error',
          duration: 3000,
          title: t('Stripe Cancel', lng),
          isClosable: true,
          position: 'top'
        });
      }
      resetProcess();
      !!stripeState && router.replace(router.pathname);
    })();
  }, [t, i18nIsInitialized, router.query, router.isReady]);
  useEffect(() => {
    const { openRecharge } = router.query;
    if (openRecharge === 'true') {
      router.replace(router.pathname);
      setRecharge(1);
    }
  }, []);
  const { NotEnoughModal } = useNotEnough();

  const rechargeRef = useRef<any>();
  const { data: balance_raw } = useQuery({
    queryKey: ['getAccount'],
    queryFn: () =>
      request.post<any, ApiResp<{ deductionBalance: number; balance: number }>>(
        '/api/account/getAmount'
      ),
    staleTime: 0
  });

  let rechargAmount = balance_raw?.data?.balance || 0;
  let expenditureAmount = balance_raw?.data?.deductionBalance || 0;
  let balance = rechargAmount - expenditureAmount;
  return (
    <RechargeContext.Provider value={{ rechargeRef }}>
      <Flex h={'100%'} p={'8px'}>
        <Flex direction="column" flexGrow={'1'} flex={'1'} overflowY={'auto'}>
          <Flex flexDirection={'column'} flex={'auto'} gap={'12px'}>
            <Box borderRadius="12px" display={['block', 'block', 'block', 'none']}>
              <Flex direction={['column', 'column', 'row', 'row']} justify={'space-between'}>
                <Box alignSelf={'center'}>
                  <UserCard balance={balance} />
                </Box>
                <Buget expenditureAmount={expenditureAmount}></Buget>
              </Flex>
            </Box>
            <Flex w={'full'} borderRadius="8px" bg="white" p="24px">
              <Trend></Trend>
            </Flex>
            <Flex
              direction={'column'}
              flex={[1, null, null, 'auto']}
              bg="white"
              p="24px"
              borderRadius="8px"
            >
              <TrendBar />
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
          gap="28px"
        >
          <UserCard balance={balance} />
          <GiftCode />
          <Buget expenditureAmount={expenditureAmount}></Buget>
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
