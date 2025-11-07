import { useMemo, useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { useQuery } from '@tanstack/react-query';
import { getRechargeBillingList } from '@/api/billing';
import OrderListView, { OrderListRow } from './OrderListView';

interface OrderListProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (v: DateRange | undefined) => void;
  orderIdFilter: string;
  onOrderIdFilterChange: (v: string) => void;
  onSelectionChange: (selected: OrderListRow[], amount: number, count: number) => void;
  onObtainInvoice?: () => void;
}

export function NoSubscriptionOrderList({
  dateRange,
  onDateRangeChange,
  orderIdFilter,
  onOrderIdFilterChange,
  onSelectionChange,
  onObtainInvoice
}: OrderListProps) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const effectiveStartTime = useMemo(() => {
    return dateRange?.from
      ? new Date(dateRange.from).toISOString()
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }, [dateRange?.from]);

  const effectiveEndTime = useMemo(() => {
    return dateRange?.to ? new Date(dateRange.to).toISOString() : new Date().toISOString();
  }, [dateRange?.to]);

  // Payment list data fetching for all regions
  const paymentListQueryBodyBase = useMemo(
    () => ({
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
      page,
      pageSize
    }),
    [effectiveStartTime, effectiveEndTime, page, pageSize]
  );

  // Fetch recharge billing data with pagination
  const { data: billingListData } = useQuery(
    ['billing', 'recharge', paymentListQueryBodyBase],
    () => getRechargeBillingList(paymentListQueryBodyBase),
    {
      keepPreviousData: true
    }
  );

  // Merged rows with data processing logic
  const rows: OrderListRow[] = useMemo(() => {
    const subscriptionPayments: OrderListRow[] = (billingListData?.data?.payments ?? []).map(
      (p) => {
        return {
          id: p.ID,
          region: '-',
          workspace: '-',
          time: p.CreatedAt,
          amount: p.Amount,
          type: 'recharge',
          selectable: !(p.InvoicedAt || p.Status === 'REFUNDED')
        };
      }
    );

    return subscriptionPayments.sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );
  }, [billingListData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [orderIdFilter, effectiveStartTime, effectiveEndTime]);

  return (
    <OrderListView
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      orderIdFilter={orderIdFilter}
      onOrderIdFilterChange={onOrderIdFilterChange}
      onSelectionChange={onSelectionChange}
      rows={rows}
      onObtainInvoice={onObtainInvoice}
      page={page}
      totalPages={billingListData?.data?.totalPage || 1}
      totalItems={billingListData?.data?.total || 0}
      pageSize={pageSize}
      onPageChange={setPage}
    />
  );
}
