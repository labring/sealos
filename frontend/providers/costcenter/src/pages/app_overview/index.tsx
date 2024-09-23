import linechart_icon from '@/assert/lineChart.svg';
import AmountDisplay from '@/components/billing/AmountDisplay';
import { BillingTrend } from '@/components/billing/BillingTrend';
import SelectRange from '@/components/billing/selectDateRange';
import SwitchPage from '@/components/billing/SwitchPage';
import AppNameMenu from '@/components/menu/AppNameMenu';
import AppTypeMenu from '@/components/menu/AppTypeMenu';
import CycleMenu from '@/components/menu/CycleMenu';
import NamespaceMenu from '@/components/menu/NamespaceMenu';
import RegionMenu from '@/components/menu/RegionMenu';
import { Refresh } from '@/components/Refresh';
import { AppOverviewTable } from '@/components/table/AppOverviewTable';
import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import useOverviewStore from '@/stores/overview';
import { ApiResp, AppOverviewBilling } from '@/types';
import { Box, Flex, Heading, HStack, Img, Text, useMediaQuery } from '@chakra-ui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useMemo, useState } from 'react';

function Billing() {
  const { t } = useTranslation();
  const { setNamespace, getAppName, getAppType, getNamespace, getRegion, getCycle } =
    useBillingStore();
  const { startTime, endTime } = useOverviewStore();
  const regionUid = getRegion()?.uid || '';
  const [orderID, setOrderID] = useState('');
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [totalItem, setTotalItem] = useState(0);
  const [pageSize, setPageSize] = useState(3);
  const namespace = getNamespace()?.[0] || '';
  // console.log('namespace', namespace)
  const queryBody = {
    endTime,
    startTime,
    regionUid,
    appType: getAppType(),
    appName: getAppName(),
    namespace,
    page,
    pageSize
  };
  const { data, isPreviousData, isFetching } = useQuery({
    queryFn() {
      return request.post<
        any,
        ApiResp<{
          overviews: AppOverviewBilling[];
          total: number;
          totalPage: number;
        }>
      >('/api/billing/appOverview', queryBody);
    },
    onSuccess(data) {
      if (!data.data) {
        return;
      }
      const { total, totalPage } = data.data;
      if (totalPage === 0) {
        // search reset
        setTotalPage(1);
        setTotalItem(1);
      } else {
        setTotalItem(total);
        setTotalPage(totalPage);
      }
      if (totalPage < page) {
        setPage(1);
      }
    },
    keepPreviousData: true,
    queryKey: ['appOverviewBilling', queryBody, page, pageSize]
  });
  const [isBigScreen1, isBigScreen2] = useMediaQuery([
    '(min-width: 1280px)',
    '(min-width: 1500px)'
  ]);
  const selectMr = '40px';
  const queryClient = useQueryClient();
  const appOverviews = useMemo(() => data?.data?.overviews || [], [data?.data?.overviews]);
  return (
    <Flex flexDirection="column" w="100%" h="100%" gap="8px" p={'8px'} overflow={'auto'}>
      <Box
        display={'flex'}
        flexDir={'column'}
        bg={'white'}
        px="24px"
        borderRadius={'8px'}
        pb={'4px'}
        pt={'20px'}
      >
        <Flex mr="24px" align={'center'} mb={'16px'} color={'grayModern.900'}>
          <Img src={linechart_icon.src} boxSize={'24px'} mr={'10px'} dropShadow={'#24282C'}></Img>
          <Heading fontSize={'18px'}>{t('SideBar.CostOverview')}</Heading>
          <Refresh
            ml={'auto'}
            onRefresh={() => {
              queryClient.invalidateQueries({});
            }}
          />
        </Flex>
        <HStack wrap={'wrap'} gap={'0px'}>
          <Flex align={'center'} mb="16px" mr={selectMr}>
            <Text fontSize={'12px'} width={'80px'} color={'grayModern.900'} fontWeight={'500'}>
              {t('Transaction Time')}
            </Text>
            <HStack gap={'8px'} w="360px">
              <CycleMenu isDisabled={isFetching} />
              <SelectRange isDisabled={isFetching} />
            </HStack>
          </Flex>
          <Flex align={'center'} mb="16px" mr={selectMr}>
            <Text fontSize={'12px'} width={'80px'} color={'grayModern.900'} fontWeight={'500'}>
              {t('region')}
            </Text>
            <RegionMenu
              isDisabled={isFetching}
              innerWidth={isBigScreen2 ? '280px' : isBigScreen1 ? '180px' : '360px'}
            />
          </Flex>
          <Flex align={'center'} mb="16px" mr={selectMr}>
            <Text fontSize={'12px'} width={'80px'} color={'grayModern.900'} fontWeight={'500'}>
              {t('workspace')}
            </Text>
            <NamespaceMenu
              isDisabled={isFetching}
              innerWidth={isBigScreen2 ? '280px' : isBigScreen1 ? '180px' : '360px'}
            />
          </Flex>
          <Flex align={'center'} mb="16px" mr={selectMr}>
            <Text fontSize={'12px'} width={'80px'} color={'grayModern.900'} fontWeight={'500'}>
              {t('APP Type')}
            </Text>
            <AppTypeMenu isDisabled={isFetching} innerWidth={'360px'} />
          </Flex>
          <Flex align={'center'} mb="16px" w="500px">
            <Text
              fontSize={'12px'}
              minW={'80px'}
              width={'80px'}
              color={'grayModern.900'}
              fontWeight={'500'}
            >
              {t('app_name')}
            </Text>
            <AppNameMenu
              isDisabled={isFetching}
              innerWidth={isBigScreen2 ? '280px' : isBigScreen1 ? '180px' : '360px'}
            />
          </Flex>
        </HStack>
      </Box>
      <HStack
        display={'flex'}
        flexDir={'column'}
        bg={'white'}
        flex={1}
        p="24px"
        borderRadius={'8px'}
      >
        <BillingTrend />
        <Flex align={'center'} gap={'5px'} alignSelf={'flex-start'}>
          <Heading size={'sm'} color={'grayModern.900'}>
            {' '}
            {t('Billing List')}
          </Heading>
        </Flex>
        <Box h={'auto'} w={'full'}>
          <AppOverviewTable data={appOverviews} w={'full'} h={'full'} />
        </Box>
        <Flex justifyContent={'space-between'} mt="20px" w="full">
          <AmountDisplay onlyOut />
          <SwitchPage
            totalPage={totalPage}
            totalItem={totalItem}
            pageSize={pageSize}
            currentPage={page}
            setCurrentPage={setPage}
            isPreviousData={isPreviousData}
            mt="0"
          />
        </Flex>
      </HStack>
    </Flex>
  );
}

export default Billing;

export async function getServerSideProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'applist'], undefined, ['zh', 'en']))
    }
  };
}
