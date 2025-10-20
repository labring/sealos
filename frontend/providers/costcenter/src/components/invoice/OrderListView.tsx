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
import { useTranslation } from 'next-i18next';

function formatDateTime(iso: string) {
  return formatDate(new Date(iso), 'yyyy-MM-dd HH:mm:ss');
}

export type OrderListRow = {
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
  rows,
  onObtainInvoice
}: {
  dateRange: DateRange | undefined;
  onDateRangeChange: (v: DateRange | undefined) => void;
  orderIdFilter: string;
  onOrderIdFilterChange: (v: string) => void;
  onSelectionChange: (selected: OrderListRow[], amount: number, count: number) => void;
  rows: OrderListRow[];
  onObtainInvoice?: () => void;
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // client-side filter by orderId (only recharge rows carry orderId)
  const filteredRows: OrderListRow[] = useMemo(() => {
    const keyword = orderIdFilter.trim();
    if (!keyword) return rows;
    return rows.filter((r) => r.id.includes(keyword));
  }, [rows, orderIdFilter]);

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

  const toggleSelect = (row: OrderListRow) => {
    const next = new Set(selectedIds);
    if (next.has(row.id)) next.delete(row.id);
    else next.add(row.id);
    setSelectedIds(next);
  };

  // emit selection change
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

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [orderIdFilter, rows]);

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
            placeholder={t('common:order_number')}
            className="w-[15rem]"
            value={orderIdFilter}
            onChange={(e) => onOrderIdFilterChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 font-medium">
          <div className="text-blue-600 text-base">
            {t('common:total_amount')}: ${formatMoney(selectedAmount).toFixed(2)}
          </div>
          <Button disabled={selectedRows.length <= 0} onClick={onObtainInvoice}>
            <ReceiptText size={16} />
            <span>
              {t('common:orders.apply_invoice')}: {selectedRows.length}
            </span>
          </Button>
        </div>
      </TableLayoutCaption>

      <TableLayoutContent>
        <TableLayoutHeadRow>
          <TableHead>
            <Checkbox checked={allSelectedOnPage} onCheckedChange={toggleSelectAllOnPage} />
          </TableHead>
          <TableHead>{t('common:order_number')}</TableHead>
          <TableHead>{t('common:region')}</TableHead>
          <TableHead>{t('common:workspace')}</TableHead>
          <TableHead>{t('common:orders.transaction_time')}</TableHead>
          <TableHead>{t('common:orders.type')}</TableHead>
          <TableHead>{t('common:total_amount')}</TableHead>
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
                  <Badge className="bg-blue-50 text-blue-600">
                    {t('common:orders.subscription_charge')}
                  </Badge>
                ) : row.type === 'recharge' ? (
                  <Badge className="bg-zinc-50 text-zinc-700">{t('common:top_up')}</Badge>
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
          <div className="flex items-center text-zinc-500">
            {t('common:total')}: {filteredRows.length}
          </div>
          <div className="flex items-center gap-3">
            <Pagination
              currentPage={page}
              totalPages={Math.max(1, Math.ceil(filteredRows.length / pageSize))}
              onPageChange={setPage}
            />
            <span>
              <span>{pageSize}</span>
              <span className="text-zinc-500"> / {t('common:page')}</span>
            </span>
          </div>
        </div>
      </TableLayoutFooter>
    </TableLayout>
  );
}
