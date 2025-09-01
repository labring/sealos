import { useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { useQuery } from '@tanstack/react-query';
import request from '@/service/request';
import { ApiResp } from '@/types';
import { RechargeBillingData } from '@/types/billing';
import { Region } from '@/types/region';
import { getPaymentList } from '@/api/plan';
import { PaymentRecord } from '@/types/plan';
import OrderListView, { CombinedRow } from './OrderListView';

interface OrderListProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (v: DateRange | undefined) => void;
  orderIdFilter: string;
  onOrderIdFilterChange: (v: string) => void;
  onSelectionChange: (selected: CombinedRow[], amount: number, count: number) => void;
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

  // Recharge billing data fetching
  const rechargeBody = useMemo(
    () => ({
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
      page: 1,
      pageSize: 9999,
      invoiced: false
    }),
    [effectiveStartTime, effectiveEndTime]
  );

  const { data: rechargeResp } = useQuery(['billing', 'invoice', rechargeBody], () => {
    return request<any, ApiResp<RechargeBillingData>>('/api/billing/rechargeBillingList', {
      data: rechargeBody,
      method: 'POST'
    });
  });

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
            return res.data as [string, string][];
          } catch (e) {
            return [] as [string, string][];
          }
        })
      );
      const merged = ([] as [string, string][]).concat(...results);
      return merged.reduce<Record<string, string>>((acc, [id, name]) => {
        acc[id] = name;
        return acc;
      }, {});
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
    queryFn: async () => {
      const entries = await Promise.all(
        (regionUids || []).map(async (uid) => {
          const payments = await getPaymentList({ ...paymentListQueryBodyBase, regionUid: uid })
            .then((res) => res?.data?.payments || [])
            .catch(() => []);
          return [uid, payments] as const;
        })
      );
      return entries.reduce<Record<string, any[]>>((acc, [uid, payments]) => {
        acc[uid] = payments;
        return acc;
      }, {});
    },
    queryKey: ['paymentListAllRegions', paymentListQueryBodyBase, regionUids],
    enabled: (regionUids?.length || 0) > 0
  });

  // Merged rows with data processing logic
  const mergedRows: CombinedRow[] = useMemo(() => {
    const rechargePayments: CombinedRow[] = (rechargeResp?.data?.payments || [])
      .filter((item) => !item.InvoicedAt && item.Status !== 'REFUNDED')
      .map((item) => ({
        id: item.ID,
        region: regionUidToName.get(item.RegionUID) || item.RegionUID || '',
        workspace: '-',
        time: item.CreatedAt,
        amount: item.Amount,
        type: 'recharge',
        raw: item
      }));

    const subscriptionPayments: CombinedRow[] = Object.entries(allPaymentsData || {}).flatMap(
      ([uid, payments]) =>
        (payments as PaymentRecord[]).map((p) => {
          return {
            id: p.ID,
            region: regionUidToName.get(uid) || uid || '',
            workspace: (allNamespaces || {})[p.Workspace] || p.Workspace || '-',
            time: p.Time,
            amount: p.Amount,
            type: 'subscription',
            raw: p
          };
        })
    );

    return [...rechargePayments, ...subscriptionPayments].sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );
  }, [rechargeResp, allPaymentsData, regionUidToName, allNamespaces]);

  return (
    <OrderListView
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      orderIdFilter={orderIdFilter}
      onOrderIdFilterChange={onOrderIdFilterChange}
      onSelectionChange={onSelectionChange}
      mergedRows={mergedRows}
      onObtainInvoice={onObtainInvoice}
    />
  );
}

export type { CombinedRow };
