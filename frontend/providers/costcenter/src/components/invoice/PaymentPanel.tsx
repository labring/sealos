import SwitchPage from '@/components/billing/SwitchPage';
import { END_TIME, START_TIME } from '@/constants/payment';
import request from '@/service/request';
import { ApiResp, RechargeBillingData, RechargeBillingItem, ReqGenInvoice } from '@/types';
import { TabPanel } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useEffect, useState, useMemo } from 'react';
import { InvoicePaymentTable } from '../table/InovicePaymentTable';

export default function PaymentPanel({
  selectbillings,
  orderID,
  setSelectBillings
}: {
  orderID: string;
  selectbillings: ReqGenInvoice['billings'];
  setSelectBillings: (list: RechargeBillingItem[]) => void;
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [totalItem, setTotalItem] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // const { startTime, endTime } = useOverviewStore()
  const endTime = END_TIME;
  const startTime = START_TIME;
  const body = {
    startTime,
    endTime,
    page,
    pageSize,
    paymentID: orderID,
    invoiced: false
  };
  const { data } = useQuery(['billing', 'invoice', body], () => {
    return request<any, ApiResp<RechargeBillingData>>('/api/billing/rechargeBillingList', {
      data: body,
      method: 'POST'
    });
  });

  const filteredPayments = useMemo(() => {
    if (!data?.data?.payments) return [];
    return data.data.payments.filter((item) => !item.InvoicedAt && item.Status !== 'REFUNDED');
  }, [data?.data?.payments]);

  const paginationInfo = useMemo(() => {
    const total = filteredPayments.length;
    const totalPage = Math.ceil(total / pageSize) || 1;

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageData = filteredPayments.slice(startIndex, endIndex);

    return {
      total,
      totalPage,
      currentPageData
    };
  }, [filteredPayments, page, pageSize]);

  useEffect(() => {
    setTotalItem(paginationInfo.total);
    setTotalPage(paginationInfo.totalPage);

    if (paginationInfo.totalPage > 0 && page > paginationInfo.totalPage) {
      setPage(1);
    }
  }, [paginationInfo.total, paginationInfo.totalPage, page]);

  return (
    <TabPanel p="0" display={'flex'} flexDirection={'column'} flex={'auto'}>
      <InvoicePaymentTable
        selectbillings={selectbillings}
        data={paginationInfo.currentPageData}
        setSelectBillings={setSelectBillings}
      />
      <SwitchPage
        marginTop={'16px'}
        mx={'auto'}
        currentPage={page}
        totalPage={paginationInfo.totalPage}
        totalItem={paginationInfo.total}
        pageSize={pageSize}
        setCurrentPage={function (idx: number): void {
          setPage(idx);
        }}
      />
    </TabPanel>
  );
}
