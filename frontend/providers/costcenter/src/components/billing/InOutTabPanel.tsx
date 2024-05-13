import useOverviewStore from '@/stores/overview';
import { memo, useContext, useEffect, useState } from 'react';
import { BillingData, BillingSpec, BillingType } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { formatISO } from 'date-fns';
import request from '@/service/request';
import { useTranslation } from 'next-i18next';
import { Flex, TabPanel, Text } from '@chakra-ui/react';
import AppMenu from '@/components/billing/AppMenu';
import SelectRange from '@/components/billing/selectDateRange';
import SearchBox from '@/components/billing/SearchBox';
import { CommonBillingTable } from '@/components/billing/billingTable';
import AmountDisplay from '@/components/billing/AmountDisplay';
import SwitchPage from '@/components/billing/SwitchPage';
import useBillingStore from '@/stores/billing';

export default function InOutTabPanel() {
  const startTime = useOverviewStore((state) => state.startTime);
  const endTime = useOverviewStore((state) => state.endTime);
  const [selectType, setType] = useState<BillingType>(BillingType.ALL);
  const [orderID, setOrderID] = useState('');
  const [totalPage, setTotalPage] = useState(1);
  const [currentPage, setcurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItem, setTotalItem] = useState(10);
  const { namespace, appType } = useBillingStore();
  useEffect(() => {
    setcurrentPage(1);
  }, [startTime, endTime, selectType, namespace]);
  const { data, isFetching, isSuccess } = useQuery(
    ['billing', 'out', { currentPage, startTime, endTime, orderID, namespace, appType }],
    () => {
      const spec: BillingSpec = {
        page: currentPage,
        pageSize: pageSize,
        type: BillingType.CONSUME,
        startTime: formatISO(startTime, { representation: 'complete' }),
        // startTime,
        endTime: formatISO(endTime, { representation: 'complete' }),
        // endTime,
        appType,
        namespace,
        orderID
      };
      return request<any, { data: BillingData }, { spec: BillingSpec }>('/api/billing', {
        method: 'POST',
        data: {
          spec
        }
      });
    },
    {
      onSuccess(data) {
        const totalPage = data.data.status.pageLength;
        if (totalPage === 0) {
          // search reset
          setTotalPage(1);
          setTotalItem(1);
        } else {
          setTotalItem(data.data.status.totalCount);
          setTotalPage(totalPage);
        }
        if (totalPage < currentPage) setcurrentPage(1);
      },
      staleTime: 1000
    }
  );
  const { t } = useTranslation();
  const tableResult = data?.data?.status?.item || [];
  return (
    <TabPanel p="0" display={'flex'} flexDirection={'column'} flex={'auto'}>
      <Flex alignItems={'center'} flexWrap={'wrap'}>
        <Flex align={'center'} mb="24px">
          <Text fontSize={'12px'} mx={'10px'} width={['60px', '60px', 'auto', 'auto']}>
            {t('APP Type')}
          </Text>
          <AppMenu isDisabled={isFetching} mr={'32px'} />
        </Flex>
        <Flex align={'center'} mb="24px">
          <Text fontSize={'12px'} mr={'12px'} width={['60px', '60px', 'auto', 'auto']}>
            {t('Transaction Time')}
          </Text>
          {<SelectRange isDisabled={isFetching}></SelectRange>}
        </Flex>
        <SearchBox isDisabled={isFetching} setOrderID={setOrderID} />
      </Flex>
      <CommonBillingTable
        data={tableResult.filter((x) => [BillingType.CONSUME].includes(x.type))}
        flex={'auto'}
        overflow={'auto'}
        overflowY={'auto'}
      />
      <Flex justifyContent={'space-between'} mt="20px">
        <AmountDisplay />
        <SwitchPage
          totalPage={totalPage}
          totalItem={totalItem}
          pageSize={pageSize}
          currentPage={currentPage}
          setCurrentPage={setcurrentPage}
          mt="0"
        />
      </Flex>
    </TabPanel>
  );
}
