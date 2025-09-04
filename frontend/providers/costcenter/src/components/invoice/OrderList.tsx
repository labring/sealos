import { useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { useQuery } from '@tanstack/react-query';
import request from '@/service/request';
import { ApiResp } from '@/types';
import { Region } from '@/types/region';
import { getPaymentList } from '@/api/plan';
import { PaymentRecord } from '@/types/plan';
import OrderListView, { OrderListRow } from './OrderListView';

interface OrderListProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (v: DateRange | undefined) => void;
  orderIdFilter: string;
  onOrderIdFilterChange: (v: string) => void;
  onSelectionChange: (selected: OrderListRow[], amount: number, count: number) => void;
  onObtainInvoice?: () => void;
}

export default function OrderList({
  dateRange,
  onDateRangeChange,
  orderIdFilter,
  onOrderIdFilterChange,
  onSelectionChange,
  onObtainInvoice
}: OrderListProps) {
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
    queryKey: ['paymentList', paymentListQueryBodyBase]
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
        type: p.Type === 'SUBSCRIPTION' ? 'subscription' : 'recharge',
        raw: p
      };
    });

    return subscriptionPayments.sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );
  }, [allPaymentsData, regionUidToName, allNamespaces]);

  return (
    <OrderListView
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      orderIdFilter={orderIdFilter}
      onOrderIdFilterChange={onOrderIdFilterChange}
      onSelectionChange={onSelectionChange}
      rows={rows}
      onObtainInvoice={onObtainInvoice}
    />
  );
}
