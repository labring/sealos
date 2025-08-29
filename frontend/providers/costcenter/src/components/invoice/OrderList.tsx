import { useEffect, useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@sealos/shadcn-ui/input';
import { Badge } from '@sealos/shadcn-ui/badge';
import { Button } from '@sealos/shadcn-ui/button';
import { DateRangePicker } from '@sealos/shadcn-ui/date-range-picker';
import { Pagination } from '@sealos/shadcn-ui/pagination';
import { Checkbox } from '@sealos/shadcn-ui/checkbox';
import { ReceiptText, Search } from 'lucide-react';
import {
  TableLayout,
  TableLayoutCaption,
  TableLayoutHeadRow,
  TableLayoutBody,
  TableLayoutFooter,
  TableLayoutContent
} from '@sealos/shadcn-ui/table-layout';
import { TableHead, TableRow, TableCell } from '@sealos/shadcn-ui/table';
import request from '@/service/request';
import { ApiResp } from '@/types';
import { RechargeBillingData, RechargeBillingItem } from '@/types/billing';
import { Region } from '@/types/region';
import { getPaymentList } from '@/api/plan';
import { formatMoney } from '@/utils/format';
import { format as formatDate } from 'date-fns';

function formatDateTime(iso: string) {
  return formatDate(new Date(iso), 'yyyy-MM-dd HH:mm:ss');
}

export type CombinedRow = {
  id: string;
  region: string;
  workspace: string;
  time: string;
  amount: number;
  type: 'recharge' | 'subscription';
  raw?: any;
};

export default function OrderList({
  dateRange,
  onDateRangeChange,
  orderId,
  onOrderIdChange,
  onSelectionChange
}: {
  dateRange: DateRange | undefined;
  onDateRangeChange: (v: DateRange | undefined) => void;
  orderId: string;
  onOrderIdChange: (v: string) => void;
  onSelectionChange: (selected: CombinedRow[], amount: number, count: number) => void;
}) {
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

  const { data: regionData } = useQuery({
    queryFn: () => request<any, ApiResp<Region[]>>('/api/getRegions'),
    queryKey: ['regionList', 'invoice']
  });
  const regionUidToName = useMemo(() => {
    const map = new Map<string, string>();
    (regionData?.data || []).forEach((r) => map.set(r.uid, r.name?.en || r.uid));
    return map;
  }, [regionData]);

  // recharge list: fixed large pageSize, no server pagination
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

  const regionUids = useMemo(() => (regionData?.data || []).map((r) => r.uid), [regionData]);
  // fetch all namespaces for all regions, build namespaceId -> name map
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
        (payments as any[]).map((p, idx) => ({
          // ! =================================================== For testing only!
          id: `${p.Time}`,
          region: regionUidToName.get(uid) || uid || '',
          workspace: (allNamespaces || {})[p.Workspace] || p.Workspace || '-',
          time: p.Time,
          amount: p.Amount,
          type: 'subscription',
          raw: p
        }))
    );

    return [...rechargePayments, ...subscriptionPayments].sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );
  }, [rechargeResp, allPaymentsData, regionUidToName, allNamespaces]);

  // client-side filter by orderId (only recharge rows carry orderId)
  const filteredRows: CombinedRow[] = useMemo(() => {
    const keyword = orderId.trim();
    if (!keyword) return mergedRows;
    return mergedRows.filter((r) => r.id.includes(keyword));
  }, [mergedRows, orderId]);

  // selection (both recharge & subscription selectable)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const currentPageRows = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredRows.slice(startIndex, endIndex);
  }, [filteredRows, page, pageSize]);

  const allSelectedOnPage = useMemo(() => {
    if (currentPageRows.length === 0) return false;
    return currentPageRows.every((r) => selectedIds.has(r.id));
  }, [currentPageRows, selectedIds]);

  const toggleSelectAllOnPage = () => {
    const next = new Set(selectedIds);
    if (allSelectedOnPage) currentPageRows.forEach((r) => next.delete(r.id));
    else currentPageRows.forEach((r) => next.add(r.id));
    setSelectedIds(next);
  };

  const toggleSelect = (row: CombinedRow) => {
    const next = new Set(selectedIds);
    if (next.has(row.id)) next.delete(row.id);
    else next.add(row.id);
    setSelectedIds(next);
  };

  // emit selection change
  const selectedRows = useMemo(
    () => mergedRows.filter((r) => selectedIds.has(r.id)),
    [mergedRows, selectedIds]
  );

  const selectedAmount = useMemo(
    () => selectedRows.reduce((s, it) => s + (it.amount || 0), 0),
    [selectedRows]
  );

  useEffect(() => {
    onSelectionChange(selectedRows, selectedAmount, selectedRows.length);
  }, [selectedRows, selectedAmount, onSelectionChange]);

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [effectiveStartTime, effectiveEndTime, orderId]);

  return (
    <TableLayout>
      <TableLayoutCaption>
        <div className="flex gap-3 items-center">
          <DateRangePicker
            className="w-fit"
            value={dateRange}
            onChange={onDateRangeChange}
            buttonClassName="shadow-none"
          />
          <Input
            icon={<Search size={16} />}
            placeholder="Order ID"
            className="w-[15rem]"
            value={orderId}
            onChange={(e) => onOrderIdChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 font-medium">
          <div className="text-blue-600 text-base">
            Amount: ${formatMoney(selectedAmount).toFixed(2)}
          </div>
          <Button disabled={selectedRows.length <= 0}>
            <ReceiptText size={16} />
            <span>Obtain Invoice: {selectedRows.length}</span>
          </Button>
        </div>
      </TableLayoutCaption>

      <TableLayoutContent>
        <TableLayoutHeadRow>
          <TableHead>
            <Checkbox checked={allSelectedOnPage} onCheckedChange={toggleSelectAllOnPage} />
          </TableHead>
          <TableHead>Order ID</TableHead>
          <TableHead>Region</TableHead>
          <TableHead>Workspace</TableHead>
          <TableHead>Transaction Time</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
        </TableLayoutHeadRow>

        <TableLayoutBody>
          {currentPageRows.map((row, idx) => (
            <TableRow key={`${row.id}-${idx}`} className="h-14">
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(row.id)}
                  onCheckedChange={() => toggleSelect(row)}
                />
              </TableCell>
              <TableCell>{row.id || '-'}</TableCell>
              <TableCell>{row.region || '-'}</TableCell>
              <TableCell>{row.workspace || ''}</TableCell>
              <TableCell>{formatDateTime(row.time)}</TableCell>
              <TableCell>
                {row.type === 'subscription' ? (
                  <Badge className="bg-blue-50 text-blue-600">Subscription Charge</Badge>
                ) : row.type === 'recharge' ? (
                  <Badge className="bg-zinc-50 text-zinc-700">Top-up</Badge>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>${formatMoney(row.amount).toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableLayoutBody>
      </TableLayoutContent>

      <TableLayoutFooter>
        <div className="px-4 py-3 flex justify-between">
          <div className="flex items-center text-zinc-500">Total: {filteredRows.length}</div>
          <div className="flex items-center gap-3">
            <Pagination
              currentPage={page}
              totalPages={Math.max(1, Math.ceil(filteredRows.length / pageSize))}
              onPageChange={setPage}
            />
            <span>
              <span>{pageSize}</span>
              <span className="text-zinc-500"> / Page</span>
            </span>
          </div>
        </div>
      </TableLayoutFooter>
    </TableLayout>
  );
}
