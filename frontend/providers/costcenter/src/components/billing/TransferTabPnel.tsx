import SearchBox from '@/components/billing/SearchBox';
import SwitchPage from '@/components/billing/SwitchPage';
import TypeMenu from '@/components/billing/TypeMenu';
import { TransferBillingTable } from '@/components/billing/billingTable';
import SelectRange from '@/components/billing/selectDateRange';
import { TRANSFER_LIST_TYPE } from '@/constants/billing';
import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import useOverviewStore from '@/stores/overview';
import { ApiResp, TransferBillingData } from '@/types';
import { Flex, TabPanel, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { formatISO } from 'date-fns';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';

export default function TransferTabPanel() {
  const startTime = useOverviewStore((state) => state.startTime);
  const endTime = useOverviewStore((state) => state.endTime);
  const [transferTypeIdx, settransferTypeIdx] = useState<number>(0);
  const [orderID, setOrderID] = useState('');
  const [totalPage, setTotalPage] = useState(1);
  const [currentPage, setcurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItem, setTotalItem] = useState(10);
  const { getNamespace } = useBillingStore();
  const namespace = getNamespace()?.[0] || '';
  const selectType = TRANSFER_LIST_TYPE[transferTypeIdx];
  useEffect(() => {
    setcurrentPage(1);
  }, [startTime, endTime, transferTypeIdx, namespace]);
  const { data, isFetching, isSuccess } = useQuery(
    ['billing', { currentPage, startTime, endTime, orderID, selectType, namespace, pageSize }],
    () => {
      const spec = {
        page: currentPage,
        pageSize: pageSize,
        type: selectType.value,
        startTime: formatISO(startTime, { representation: 'complete' }),
        endTime: formatISO(endTime, { representation: 'complete' }),
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
        <Flex align={'center'} mb="24px" ml={'48px'}>
          <Text fontSize={'12px'} mr={'12px'} width={['60px', '60px', 'auto', 'auto']}>
            {t('Type')}
          </Text>
          <TypeMenu setIdx={settransferTypeIdx} idx={transferTypeIdx} isDisabled={isFetching} />
        </Flex>
        <SearchBox isDisabled={isFetching} setOrderID={setOrderID} />
      </Flex>

      <TransferBillingTable data={tableResult || []} />
      <Flex justifyContent={'flex-end'}>
        <SwitchPage
          totalPage={totalPage}
          totalItem={totalItem}
          pageSize={pageSize}
          currentPage={currentPage}
          setCurrentPage={setcurrentPage}
        />
      </Flex>
    </TabPanel>
  );
}
