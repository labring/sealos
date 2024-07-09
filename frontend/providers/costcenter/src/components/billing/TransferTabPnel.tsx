import useOverviewStore from '@/stores/overview';
import { useContext, useEffect, useState } from 'react';
import {
  ApiResp,
  BillingData,
  BillingSpec,
  BillingType,
  TransferBilling,
  TransferBillingData,
  TransferType
} from '@/types';
import { useQuery } from '@tanstack/react-query';
import { formatISO } from 'date-fns';
import request from '@/service/request';
import { useTranslation } from 'next-i18next';
import { Text, Flex, TabPanel } from '@chakra-ui/react';
import SelectRange from '@/components/billing/selectDateRange';
import TypeMenu from '@/components/billing/TypeMenu';
import SearchBox from '@/components/billing/SearchBox';
import { TransferBillingTable } from '@/components/billing/billingTable';
import SwitchPage from '@/components/billing/SwitchPage';
import NotFound from '../notFound';
import useBillingStore from '@/stores/billing';

export default function TransferTabPanel() {
  const startTime = useOverviewStore((state) => state.startTime);
  const endTime = useOverviewStore((state) => state.endTime);
  const [selectType, setType] = useState<TransferType>(TransferType.ALL);
  const [orderID, setOrderID] = useState('');
  const [totalPage, setTotalPage] = useState(1);
  const [currentPage, setcurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItem, setTotalItem] = useState(10);
  const { namespace } = useBillingStore();
  useEffect(() => {
    setcurrentPage(1);
  }, [startTime, endTime, selectType, namespace]);
  const { data, isFetching, isSuccess } = useQuery(
    ['billing', { currentPage, startTime, endTime, orderID, selectType, namespace, pageSize }],
    () => {
      const spec = {
        page: currentPage,
        pageSize: pageSize,
        type: selectType,
        startTime: formatISO(startTime, { representation: 'complete' }),
        // startTime,
        endTime: formatISO(endTime, { representation: 'complete' }),
        // endTime,
        // orderID
        orderID
      };
      return request<any, ApiResp<TransferBillingData>>('/api/billing/transfer', {
        method: 'POST',
        data: spec
      });
    },
    {
      onSuccess(data) {
        const totalPage = data.data?.totalPage || 0;
        if (totalPage === 0) {
          // 搜索时的bug
          setTotalPage(1);
          setTotalItem(1);
        } else {
          setTotalItem(data.data?.total || 0);
          setTotalPage(totalPage);
        }
        if (totalPage < currentPage) setcurrentPage(1);
      },
      staleTime: 1000
    }
  );
  const { t } = useTranslation();
  const tableResult = data?.data?.transfers || [];
  return (
    <TabPanel p="0" flex={1} display={'flex'} flexDirection={'column'}>
      <Flex alignItems={'center'} flexWrap={'wrap'}>
        <Flex align={'center'} mb="24px">
          <Text fontSize={'12px'} mr={'12px'} width={['60px', '60px', 'auto', 'auto']}>
            {t('Transaction Time')}
          </Text>
          <SelectRange isDisabled={isFetching}></SelectRange>
        </Flex>
        <Flex align={'center'} mb="24px">
          <Text fontSize={'12px'} mr={'12px'} width={['60px', '60px', 'auto', 'auto']}>
            {t('Type')}
          </Text>
          <TypeMenu selectType={selectType} setType={setType} isDisabled={isFetching} />
        </Flex>
        <SearchBox isDisabled={isFetching} setOrderID={setOrderID} />
      </Flex>
      {isSuccess && tableResult.length > 0 ? (
        <>
          <TransferBillingTable data={tableResult} />
          <Flex justifyContent={'flex-end'}>
            <SwitchPage
              totalPage={totalPage}
              totalItem={totalItem}
              pageSize={pageSize}
              currentPage={currentPage}
              setCurrentPage={setcurrentPage}
            />
          </Flex>
        </>
      ) : (
        <Flex direction={'column'} w="full" align={'center'} flex={'1'} h={'0'} justify={'center'}>
          <NotFound></NotFound>
        </Flex>
      )}
    </TabPanel>
  );
}
