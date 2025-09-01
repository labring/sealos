import { useEffect, useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';
import { useQuery } from '@tanstack/react-query';
import request from '@/service/request';
import { ApiResp, InvoiceListData } from '@/types';
import { InvoicePayload } from '@/types/invoice';
import InvoiceHistoryView from './InvoiceHistoryView';

interface InvoiceHistoryProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (v: DateRange | undefined) => void;
  orderIdFilter: string;
  onOrderIdFilterChange: (v: string) => void;
  toInvoiceDetail?: () => void;
}

export default function InvoiceHistory({
  dateRange,
  onDateRangeChange,
  orderIdFilter,
  onOrderIdFilterChange,
  toInvoiceDetail
}: InvoiceHistoryProps) {
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [totalItem, setTotalItem] = useState(0);
  const pageSize = 10;

  // Calculate effective date range
  const effectiveStartTime = useMemo(() => {
    return dateRange?.from
      ? new Date(dateRange.from).toISOString()
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // Default to 30 days ago
  }, [dateRange?.from]);

  const effectiveEndTime = useMemo(() => {
    return dateRange?.to ? new Date(dateRange.to).toISOString() : new Date().toISOString();
  }, [dateRange?.to]);

  // Query body for API request
  const queryBody = useMemo(
    () => ({
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
      page,
      pageSize,
      // Add orderId filter if needed in the future
      ...(orderIdFilter.trim() && { orderId: orderIdFilter.trim() })
    }),
    [effectiveStartTime, effectiveEndTime, page, pageSize, orderIdFilter]
  );

  // Fetch invoice list data
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

  // Update pagination info when data changes
  useEffect(() => {
    if (!data?.data) {
      return;
    }
    const { total, totalPage } = data.data;
    if (totalPage === 0) {
      // reset when no results
      setTotalPage(1);
      setTotalItem(0);
    } else {
      setTotalItem(total);
      setTotalPage(totalPage);
    }
    // Reset to page 1 if current page exceeds total pages
    if (totalPage < page) {
      setPage(1);
    }
  }, [data?.data, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [effectiveStartTime, effectiveEndTime, orderIdFilter]);

  // Filter invoice list based on orderId (client-side filtering if needed)
  const filteredInvoiceList = useMemo(() => {
    const invoices = data?.data?.invoices || [];
    if (!orderIdFilter.trim()) return invoices;

    // If server doesn't support orderId filtering, do it client-side
    return invoices.filter(
      (invoice) =>
        invoice.id.includes(orderIdFilter.trim()) || invoice.detail?.includes(orderIdFilter.trim())
    );
  }, [data?.data?.invoices, orderIdFilter]);

  return (
    <InvoiceHistoryView
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      orderIdFilter={orderIdFilter}
      onOrderIdFilterChange={onOrderIdFilterChange}
      invoiceList={filteredInvoiceList}
      isLoading={isLoading}
      totalItem={totalItem}
      currentPage={page}
      totalPages={totalPage}
      onPageChange={setPage}
      toInvoiceDetail={toInvoiceDetail}
    />
  );
}

export type { InvoicePayload };
