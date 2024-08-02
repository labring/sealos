import useOverviewStore from '@/stores/overview';
import { useEffect, useMemo, useState } from 'react';
import {
  ApiResp,
  APPBillingItem,
  AppOverviewBilling,
  BillingData,
  BillingSpec,
  BillingType
} from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import request from '@/service/request';
import { useTranslation } from 'next-i18next';
import { Flex, Heading, HStack, Img, TabPanel, Text, useMediaQuery } from '@chakra-ui/react';
import SelectRange from '@/components/billing/selectDateRange';
import AmountDisplay from '@/components/billing/AmountDisplay';
import SwitchPage from '@/components/billing/SwitchPage';
import useBillingStore from '@/stores/billing';
import AppNameMenu from '../menu/AppNameMenu';
import AppTypeMenu from '../menu/AppTypeMenu';
import CycleMenu from '../menu/CycleMenu';
import NamespaceMenu from '../menu/NamespaceMenu';
import RegionMenu from '../menu/RegionMenu';
import { AppBillingTable } from '../table/AppBillingTable';
import router from 'next/router';
import { isNumber, isString } from 'lodash';

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
  // useEffect(() => {
  // 	if (!router.query) return
  // 	const {
  // 		appNameIdx,
  // 		appTypeIdx,
  // 		namespaceIdx,
  // 		regionIdx,
  // 	} = router.query
  // 	if (isNumber(appNameIdx) && isNumber(appTypeIdx) && isNumber(namespaceIdx) && isNumber(regionIdx)) {
  // 		setRegion(regionIdx)
  // 		setNamespace(namespaceIdx)
  // 		setAppType(appTypeIdx)
  // 		setAppName(appNameIdx)
  // 	}
  // }, [router])

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
          <RegionMenu
            isDisabled={isFetching}
            innerWidth={isBigScreen2 ? '300px' : isBigScreen1 ? '180px' : '300px'}
          />
        </Flex>
        <Flex align={'center'} mb="16px" mr="40px">
          <Text fontSize={'12px'} width={'80px'} color={'grayModern.900'} fontWeight={'500'}>
            {t('workspace')}
          </Text>
          <NamespaceMenu
            isDisabled={isFetching}
            innerWidth={isBigScreen2 ? '300px' : isBigScreen1 ? '180px' : '300px'}
          />
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
