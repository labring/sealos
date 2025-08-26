import AmountDisplay from '@/components/billing/AmountDisplay';
import SwitchPage from '@/components/billing/SwitchPage';
import SelectRange from '@/components/billing/selectDateRange';
import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import useOverviewStore from '@/stores/overview';
import { APPBillingItem, ApiResp } from '@/types';
import { Flex, HStack, TabPanel, Text, useMediaQuery } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useMemo, useState } from 'react';
import AppNameMenu from '../menu/AppNameMenu';
import AppTypeMenu from '../menu/AppTypeMenu';
import NamespaceMenu from '../menu/NamespaceMenu';
import RegionMenu from '../menu/RegionMenu';
import { AppBillingTable } from '../table/AppBillingTable';

export default function InOutTabPanel() {
  const { t } = useTranslation();
  const { getAppName, getRegion, getAppType, getNamespace } = useBillingStore();
  const { startTime, endTime } = useOverviewStore();
  const regionUid = getRegion()?.uid || '';
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [totalItem, setTotalItem] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isBigScreen1, isBigScreen2] = useMediaQuery([
    '(min-width: 1200px)',
    '(min-width: 1440px)'
  ]);
  const queryBody = {
    endTime,
    startTime,
    regionUid,
    appType: getAppType(),
    appName: getAppName(),
    namespace: getNamespace()?.[0] || '',
    page,
    pageSize
  };

  const { data, isPreviousData, isFetching } = useQuery({
    queryFn() {
      return request.post<
        any,
        ApiResp<{
          costs: APPBillingItem[];
          current_page: number;
          total_pages: number;
          total_records: number;
        }>
      >('/api/billing/appBilling', queryBody);
    },
    onSuccess(data) {
      if (!data.data) {
        return;
      }
      const { total_records: total, total_pages: totalPage } = data.data;
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

  const appOverviews = useMemo(() => data?.data?.costs || [], [data?.data?.costs]);
  return (
    <TabPanel p="0" display={'flex'} flexDirection={'column'} flex={'auto'}>
      <HStack wrap={'wrap'} gap={'0'}>
        <Flex align={'center'} mb="16px" mr={'40px'}>
          <Text fontSize={'12px'} width={'80px'}>
            {t('Transaction Time')}
          </Text>
          <SelectRange isDisabled={isFetching} w={'300px'} />
        </Flex>
        <Flex align={'center'} mb="16px" mr="40px">
          <Text fontSize={'12px'} width={'80px'} color={'grayModern.900'} fontWeight={'500'}>
            {t('region')}
          </Text>
          <RegionMenu isDisabled={isFetching} />
        </Flex>
        <Flex align={'center'} mb="16px" mr="40px">
          <Text fontSize={'12px'} width={'80px'} color={'grayModern.900'} fontWeight={'500'}>
            {t('workspace')}
          </Text>
          <NamespaceMenu isDisabled={isFetching} />
        </Flex>
        <Flex align={'center'} mb="16px" mr={'40px'}>
          <Text fontSize={'12px'} width={'80px'} color={'grayModern.900'} fontWeight={'500'}>
            {t('APP Type')}
          </Text>
          <AppTypeMenu isDisabled={isFetching} innerWidth={'300px'} />
        </Flex>
        <Flex align={'center'} mb="16px" color={'grayModern.900'} fontWeight={'500'}>
          <Text fontSize={'12px'} minW={'80px'} width={'80px'}>
            {t('app_name')}
          </Text>
          <AppNameMenu
            isDisabled={isFetching || !queryBody.appType}
            innerWidth={isBigScreen2 ? '300px' : isBigScreen1 ? '180px' : '300px'}
          />
        </Flex>
        {/* <SearchBox isDisabled={isFetching} setOrderID={setOrderID} /> */}
      </HStack>
      <HStack mt={'20px'} flex={1} display={'flex'} flexDir={'column'} h="0">
        <AppBillingTable
          data={appOverviews}
          flex={'auto'}
          overflow={'auto'}
          h={'0'}
          minH={'30px'}
          overflowY={'auto'}
        />
        <Flex justifyContent={'space-between'} mt="20px" w="full" wrap={'wrap-reverse'}>
          <AmountDisplay />
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
      {/* <BillingDetailsModal query={BillingDetailQuery}/> */}
    </TabPanel>
  );
}
