import { useMemo, useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { useQuery } from '@tanstack/react-query';
import request from '@/service/request';
import { ApiResp } from '@/types';
import { Region } from '@/types/region';
import { getPaymentList } from '@/api/plan';
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

export function WithSubscriptionOrderList({
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
  const effectiveStartTime = useMemo(() => {
    return dateRange?.from
      ? new Date(dateRange.from).toISOString()
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }, [dateRange?.from]);

  const effectiveEndTime = useMemo(() => {
    return dateRange?.to ? new Date(dateRange.to).toISOString() : new Date().toISOString();
  }, [dateRange?.to]);

  // Region data fetching
  const { data: regionData } = useQuery({
    queryFn: () => request<any, ApiResp<Region[]>>('/api/getRegions'),
    queryKey: ['regionList', 'invoice']
  });

  const regionUidToName = useMemo(() => {
    const map = new Map<string, string>();
    (regionData?.data || []).forEach((r) => map.set(r.uid, r.name?.en || r.uid));
    return map;
  }, [regionData]);

  const regionUids = useMemo(() => (regionData?.data || []).map((r) => r.uid), [regionData]);

  // Namespace data fetching for all regions
  const { data: allNamespaces } = useQuery({
    queryKey: ['allNamespacesForInvoice', regionUids, effectiveStartTime, effectiveEndTime],
    enabled: (regionUids?.length || 0) > 0,
    queryFn: async () => {
      const results = await Promise.all(
        (regionUids || []).map(async (uid) => {
          try {
            const res = await request.post('/api/billing/getNamespaceList', {
              startTime: effectiveStartTime,
              endTime: effectiveEndTime,
              regionUid: uid
            });
            return {
              regionUid: uid,
              data: res.data as [string, string][]
            };
          } catch (e) {
            return null;
          }
        })
      );

      return results.reduce<Array<{ regionUid: string; namespace: string; workspaceName: string }>>(
        (acc, data) => {
          if (!data) return acc;

          return acc.concat(
            data.data.map(([namespace, workspaceName]) => ({
              regionUid: data.regionUid,
              namespace,
              workspaceName
            }))
          );
        },
        []
      );
    }
  });

  // Payment list data fetching for all regions
  const paymentListQueryBodyBase = useMemo(
    () => ({
      startTime: effectiveStartTime,
      endTime: effectiveEndTime
    }),
    [effectiveStartTime, effectiveEndTime]
  );

  const { data: allPaymentsData } = useQuery({
    queryFn: () =>
      getPaymentList({ ...paymentListQueryBodyBase }).then((res) => res?.data?.payments || []),
    queryKey: ['payment-list', 'subscription', paymentListQueryBodyBase]
  });

  // Merged rows with data processing logic
  const rows: OrderListRow[] = useMemo(() => {
    const subscriptionPayments: OrderListRow[] = (allPaymentsData ?? []).map((p) => {
      return {
        id: p.ID,
        region:
          regionUidToName.get(
            allNamespaces?.find(({ namespace }) => p.Workspace === namespace)?.regionUid ?? ''
          ) ?? '-',
        workspace:
          allNamespaces?.find(({ namespace }) => p.Workspace === namespace)?.workspaceName ?? '-',
        time: p.Time,
        amount: p.Amount,
        typeTag:
          p.Type === 'SUBSCRIPTION' ? (
            <Badge className="bg-blue-50 text-blue-600">
              {t('common:orders.subscription_charge')}
            </Badge>
          ) : (
            <Badge className="bg-zinc-50 text-zinc-700">{t('common:top_up')}</Badge>
          ),
        selectable: true
      };
    });

    return subscriptionPayments.sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );
  }, [allPaymentsData, regionUidToName, allNamespaces]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [orderIdFilter, effectiveStartTime, effectiveEndTime]);

  // Frontend pagination: filter and slice rows
  const filteredRows = useMemo(() => {
    const keyword = orderIdFilter.trim();
    if (!keyword) return rows;
    return rows.filter((r) => r.id.includes(keyword));
  }, [rows, orderIdFilter]);

  const totalItems = filteredRows.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Get current page rows
  const currentPageRows = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredRows.slice(startIndex, endIndex);
  }, [filteredRows, page, pageSize]);

  // Calculate global selection state (from all rows, not just current page)
  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.has(r.id)),
    [rows, selectedIds]
  );

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

  return (
    <OrderListView
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      orderIdFilter={orderIdFilter}
      onOrderIdFilterChange={onOrderIdFilterChange}
      rows={currentPageRows}
      onObtainInvoice={onObtainInvoice}
      page={page}
      totalPages={totalPages}
      totalItems={totalItems}
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
