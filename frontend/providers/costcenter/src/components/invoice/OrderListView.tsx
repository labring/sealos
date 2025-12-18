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
import CurrencySymbol from '../CurrencySymbol';

function formatDateTime(iso: string) {
  return formatDate(new Date(iso), 'yyyy-MM-dd HH:mm:ss');
}

export type OrderListRow = {
  id: string;
  region?: string;
  workspace?: string;
  time: string;
  amount: number;
  typeTag?: React.ReactNode;
  selectable: boolean;
};

export default function OrderListView({
  dateRange,
  onDateRangeChange,
  orderIdFilter,
  onOrderIdFilterChange,
  rows,
  onObtainInvoice,
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  selectedCount,
  selectedAmount,
  isLoading
}: {
  dateRange: DateRange | undefined;
  onDateRangeChange: (v: DateRange | undefined) => void;
  orderIdFilter: string;
  onOrderIdFilterChange: (v: string) => void;
  rows: OrderListRow[];
  onObtainInvoice?: () => void;
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
  selectedCount: number;
  selectedAmount: number;
  isLoading: boolean;
}) {
  const { t } = useTranslation();

  // client-side filter by orderId (only recharge rows carry orderId)
  const filteredRows: OrderListRow[] = useMemo(() => {
    const keyword = orderIdFilter.trim();
    if (!keyword) return rows;
    return rows.filter((r) => r.id.includes(keyword));
  }, [rows, orderIdFilter]);

  const allSelectedOnPage = useMemo(() => {
    const selectableRows = filteredRows.filter((r) => r.selectable);
    if (selectableRows.length === 0) return false;
    return selectableRows.every((r) => selectedIds.has(r.id));
  }, [filteredRows, selectedIds]);

  const toggleSelectAllOnPage = () => {
    const selectableIds = filteredRows.filter((r) => r.selectable).map((r) => r.id);
    onToggleSelectAll(selectableIds);
  };

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
            <span>
              <span>{t('common:total_amount')}:</span>
              <CurrencySymbol />
              <span>{formatMoney(selectedAmount).toFixed(2)}</span>
            </span>
          </div>
          <Button disabled={selectedCount <= 0} onClick={onObtainInvoice}>
            <ReceiptText size={16} />
            <span>
              {t('common:orders.apply_invoice')}: {selectedCount}
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
          {isLoading ? (
            <tr>
              <td colSpan={7}>
                <div className="flex justify-center items-center w-full px-12 py-6 text-zinc-500">
                  {t('loading_data')}
                </div>
              </td>
            </tr>
          ) : (
            filteredRows.map((row, idx) => (
              <TableRow key={`${row.id}-${idx}`} className="h-14">
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(row.id)}
                    disabled={!row.selectable}
                    onCheckedChange={() => onToggleSelect(row.id)}
                  />
                </TableCell>
                <TableCell>{row.id || '-'}</TableCell>
                <TableCell>{row.region || '-'}</TableCell>
                <TableCell>{row.workspace || '-'}</TableCell>
                <TableCell>{formatDateTime(row.time)}</TableCell>
                <TableCell>{row.typeTag || '-'}</TableCell>
                <TableCell>
                  <CurrencySymbol />
                  <span>{formatMoney(row.amount).toFixed(2)}</span>
                </TableCell>
              </TableRow>
            ))
          )}

          {!isLoading && filteredRows.length <= 0 && (
            <tr>
              <td colSpan={7}>
                <div className="flex justify-center items-center w-full px-12 py-6 text-zinc-500">
                  {t('no_data_available')}
                </div>
              </td>
            </tr>
          )}
        </TableLayoutBody>
      </TableLayoutContent>

      <TableLayoutFooter>
        <div className="px-4 py-3 flex justify-between">
          <div className="flex items-center text-zinc-500">
            {t('common:total')}: {totalItems}
          </div>
          <div className="flex items-center gap-3">
            <Pagination
              currentPage={page}
              totalPages={Math.max(1, totalPages)}
              onPageChange={onPageChange}
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
