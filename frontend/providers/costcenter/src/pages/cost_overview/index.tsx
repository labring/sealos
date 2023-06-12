import bar_icon from '@/assert/bar_chart_4_bars_black.svg';
import { BillingTable } from '@/components/billing/billingTable';
import SelectRange from '@/components/billing/selectDateRange';
import useNotEnough from '@/hooks/useNotEnough';
import request from '@/service/request';
import useOverviewStore from '@/stores/overview';
import { BillingData, BillingSpec } from '@/types/billing';
import { Box, Flex, Heading, Img } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { addDays, differenceInDays, formatISO, subDays, subSeconds } from 'date-fns';
import { useTranslation, withTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useMemo } from 'react';
import { Buget } from '../../components/cost_overview/buget';
import UserCard from '../../components/cost_overview/components/user';
import { Cost } from '../../components/cost_overview/cost';
import { Trend } from '../../components/cost_overview/trend';
import { getCookie } from '@/utils/cookieUtils';

function CostOverview() {
  const { t, i18n, ready } = useTranslation();
  const cookie = getCookie('NEXT_LOCALE');
  useEffect(() => {
    i18n.changeLanguage(cookie);
  }, [cookie, i18n]);
  const startTime = useOverviewStore((state) => state.startTime);
  const endTime = useOverviewStore((state) => state.endTime);
  const { NotEnoughModal } = useNotEnough();

  const { data } = useQuery(['billing', { startTime, endTime }], () => {
    const start = startTime;
    const end = subSeconds(addDays(endTime, 1), 1);
    const delta = differenceInDays(end, start);
    const pre = subDays(start, delta);
    const spec: BillingSpec = {
      startTime: formatISO(pre, { representation: 'complete' }),
      // pre,
      endTime: formatISO(end, { representation: 'complete' }),
      // start,
      page: 1,
      pageSize: (delta + 1) * 48,
      type: -1,
      orderID: ''
    };
    return request<any, { data: BillingData }, { spec: BillingSpec }>('/api/billing', {
      method: 'POST',
      data: {
        spec
      }
    });
  });
  const billingItems = useMemo(() => data?.data.status.item.filter((v, i) => i < 3) || [], [data]);

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
