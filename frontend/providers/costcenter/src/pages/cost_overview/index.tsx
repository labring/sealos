import bar_icon from '@/assert/bar_chart_4_bars_black.svg';
import { BillingTable } from '@/components/billing/billingTable';
import SelectRange from '@/components/billing/selectDateRange';
import useNotEnough from '@/hooks/useNotEnough';
import { Box, Flex, Heading, Img } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useMemo } from 'react';
import { Buget } from '@/components/cost_overview/buget';
import UserCard from '@/components/cost_overview/components/user';
import { Cost } from '@/components/cost_overview/cost';
import { Trend } from '@/components/cost_overview/trend';
import { getCookie } from '@/utils/cookieUtils';
import useBillingData from '@/hooks/useBillingData';
import NotFound from '@/components/notFound';
import { QueryClient } from '@tanstack/react-query';
import request from '@/service/request';
import useBillingStore from '@/stores/billing';
function CostOverview() {
  const { t, i18n } = useTranslation();
  const updateCPU = useBillingStore((state) => state.updateCpu);
  const updateMemory = useBillingStore((state) => state.updateMemory);
  const updateStorage = useBillingStore((state) => state.updateStorage);
  const cookie = getCookie('NEXT_LOCALE');
  useEffect(() => {
    i18n.changeLanguage(cookie);
  }, [cookie, i18n]);
  const { NotEnoughModal } = useNotEnough();

  const { data, isInitialLoading } = useBillingData();
  const billingItems = useMemo(() => data?.data?.status.item.filter((v, i) => i < 3) || [], [data]);
  useEffect(() => {
    if (billingItems.length === 0) return;
    const item = billingItems[0].costs;
    updateCPU(item?.cpu || 0);
    updateMemory(item?.memory || 0);
    updateStorage(item?.storage || 0);
  }, [billingItems, updateCPU, updateMemory, updateStorage]);
  useEffect(() => {
    // 并发预加载
    new QueryClient().prefetchQuery(['valuation'], () => request('/api/price'));
  }, []);
  return (
    <>
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

          <Flex flexDirection={'column'}>
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
            <Flex direction={'column'} h={'0'} flex={1}>
              <Heading size={'sm'} mb={'36px'}>
                {t('Recent Transactions')}
              </Heading>
              <Box overflowX={'auto'}>
                <BillingTable data={billingItems}></BillingTable>
                {(isInitialLoading || billingItems.length === 0) && (
                  <Flex h="160px" justify={'center'} align={'center'}>
                    <NotFound></NotFound>
                  </Flex>
                )}
              </Box>
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
    </>
  );
}

export async function getServerSideProps(content: any) {
  const locale = content?.req?.cookies?.NEXT_LOCALE || 'zh';
  return {
    props: {
      ...(await serverSideTranslations(locale, undefined, null, content.locales))
    }
  };
}

export default CostOverview;
