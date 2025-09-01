import { useEffect, useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';
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

export default function OrderListView({
  dateRange,
  onDateRangeChange,
  orderIdFilter,
  onOrderIdFilterChange,
  onSelectionChange,
  mergedRows,
  onObtainInvoice
}: {
  dateRange: DateRange | undefined;
  onDateRangeChange: (v: DateRange | undefined) => void;
  orderIdFilter: string;
  onOrderIdFilterChange: (v: string) => void;
  onSelectionChange: (selected: CombinedRow[], amount: number, count: number) => void;
  mergedRows: CombinedRow[];
  onObtainInvoice?: () => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // client-side filter by orderId (only recharge rows carry orderId)
  const filteredRows: CombinedRow[] = useMemo(() => {
    const keyword = orderIdFilter.trim();
    if (!keyword) return mergedRows;
    return mergedRows.filter((r) => r.id.includes(keyword));
  }, [mergedRows, orderIdFilter]);

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
  }, [orderIdFilter, mergedRows]);

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
            value={orderIdFilter}
            onChange={(e) => onOrderIdFilterChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 font-medium">
          <div className="text-blue-600 text-base">
            Amount: ${formatMoney(selectedAmount).toFixed(2)}
          </div>
          <Button disabled={selectedRows.length <= 0} onClick={onObtainInvoice}>
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
              <TableCell>{row.workspace || '-'}</TableCell>
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
