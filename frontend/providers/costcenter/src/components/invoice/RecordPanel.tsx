import useOverviewStore from '@/stores/overview';
import { useEffect, useMemo, useState } from 'react';
import {
  ApiResp,
  APPBillingItem,
  AppOverviewBilling,
  BillingData,
  BillingSpec,
  BillingType,
  InvoiceListData,
  InvoicePayload,
  RechargeBillingData,
  RechargeBillingItem,
  ReqGenInvoice
} from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import request from '@/service/request';
import { useTranslation } from 'next-i18next';
import { Flex, Heading, HStack, Img, TabPanel, Text, useMediaQuery } from '@chakra-ui/react';
import SwitchPage from '@/components/billing/SwitchPage';
import { InvoiceTable } from '../table/InoviceTable';

export default function RecordPanel({ toInvoiceDetail }: { toInvoiceDetail: () => void }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [totalItem, setTotalItem] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const { startTime, endTime } = useOverviewStore();
  const queryBody = {
    startTime,
    endTime,
    page,
    pageSize
  };
  const { data, isLoading, isSuccess, isPreviousData } = useQuery(
    ['billing', 'invoicelist', queryBody],
    () => {
      return request<any, ApiResp<InvoiceListData>>('/api/invoice/list', {
        data: queryBody,
        method: 'POST'
      });
    },
    {
      keepPreviousData: true
    }
  );
  useEffect(() => {
    if (!data?.data) {
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
  }, [data?.data]);

  return (
    <TabPanel p="0" display={'flex'} flexDirection={'column'} flex={'auto'}>
      <InvoiceTable
        data={data?.data?.invoices || []}
        toInvoiceDetail={toInvoiceDetail}
      ></InvoiceTable>

      <SwitchPage
        isPreviousData={isPreviousData}
        marginTop={'16px'}
        mx={'auto'}
        currentPage={page}
        totalPage={totalPage}
        totalItem={totalItem}
        pageSize={pageSize}
        setCurrentPage={function (idx: number): void {
          setPage(idx);
        }}
      ></SwitchPage>
      {/* <BillingDetailsModal query={BillingDetailQuery}/> */}
    </TabPanel>
  );
}
