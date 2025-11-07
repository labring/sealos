import { useMemo, useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { useQuery } from '@tanstack/react-query';
import { getRechargeBillingList } from '@/api/billing';
import OrderListView, { OrderListRow } from './OrderListView';
import { Badge } from '@sealos/shadcn-ui/badge';
import { useTranslation } from 'next-i18next';

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
  const { t } = useTranslation();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allRowsMap, setAllRowsMap] = useState<Map<string, OrderListRow>>(new Map());

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
          time: p.CreatedAt,
          amount: p.Amount,
          typeTag:
            p.ChargeSource === 'balance' ? (
              <Badge className="bg-zinc-50 text-zinc-600">
                {t('common:orders.source_balance')}
              </Badge>
            ) : p.InvoicedAt ? (
              <Badge className="bg-green-50 text-green-600">{t('common:orders.invoiced')}</Badge>
            ) : p.Status === 'REFUNDED' ? (
              <Badge className="bg-zinc-50 text-zinc-600">{t('common:orders.refunded')}</Badge>
            ) : (
              <Badge className="bg-blue-50 text-blue-600">{t('common:top_up')}</Badge>
            ),
          selectable: !(p.InvoicedAt || p.Status === 'REFUNDED' || p.ChargeSource === 'balance')
        };
      }
    );

    return subscriptionPayments.sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );
  }, [billingListData, t]);

  // Update allRowsMap when rows change (for global selection tracking)
  useEffect(() => {
    setAllRowsMap((prevMap) => {
      const newMap = new Map(prevMap);
      rows.forEach((row) => {
        newMap.set(row.id, row);
      });
      return newMap;
    });
  }, [rows]);

  // Calculate global selection state
  const selectedRows = useMemo(() => {
    return Array.from(selectedIds)
      .map((id) => allRowsMap.get(id))
      .filter((row): row is OrderListRow => row !== undefined);
  }, [selectedIds, allRowsMap]);

  const selectedAmount = useMemo(
    () => selectedRows.reduce((s, it) => s + (it.amount || 0), 0),
    [selectedRows]
  );

  useEffect(() => {
    onSelectionChange(selectedRows, selectedAmount, selectedRows.length);
  }, [selectedRows, selectedAmount, onSelectionChange]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = (ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  };

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
      rows={rows}
      onObtainInvoice={onObtainInvoice}
      page={page}
      totalPages={billingListData?.data?.totalPage || 1}
      totalItems={billingListData?.data?.total || 0}
      pageSize={pageSize}
      onPageChange={setPage}
      selectedIds={selectedIds}
      onToggleSelect={handleToggleSelect}
      onToggleSelectAll={handleToggleSelectAll}
      selectedCount={selectedRows.length}
      selectedAmount={selectedAmount}
    />
  );
}
