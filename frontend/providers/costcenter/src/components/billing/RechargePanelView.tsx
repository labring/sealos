import { useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { Input } from '@sealos/shadcn-ui/input';
import { DateRangePicker } from '@sealos/shadcn-ui/date-range-picker';
import { Pagination } from '@sealos/shadcn-ui/pagination';
import { Search } from 'lucide-react';
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
import CurrencySymbol from '@/components/CurrencySymbol';

function formatDateTime(iso: string) {
  return formatDate(new Date(iso), 'yyyy-MM-dd HH:mm');
}

export type RechargeRow = {
  id: string;
  createdAt: string;
  gift: number;
  amount: number;
  raw?: any;
};

export default function RechargePanelView({
  dateRange,
  onDateRangeChange,
  orderIdFilter,
  onOrderIdFilterChange,
  rows,
  isLoading,
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange
}: {
  dateRange: DateRange | undefined;
  onDateRangeChange: (v: DateRange | undefined) => void;
  orderIdFilter: string;
  onOrderIdFilterChange: (v: string) => void;
  rows: RechargeRow[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();

  // Client-side filter by order ID
  const filteredRows: RechargeRow[] = useMemo(() => {
    const keyword = orderIdFilter.trim();
    if (!keyword) return rows;
    return rows.filter((r) => r.id.includes(keyword));
  }, [rows, orderIdFilter]);

  // Calculate total amount for display (only from filtered rows on current page)
  const totalAmount = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.amount, 0),
    [filteredRows]
  );

  return (
    <TableLayout>
      <TableLayoutCaption className="px-6">
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
          <div className="text-blue-600 text-base inline-flex items-center gap-1 whitespace-nowrap">
            <span>{t('common:total_amount')}:</span>
            <CurrencySymbol />
            <span>{formatMoney(totalAmount).toFixed(2)}</span>
          </div>
        </div>
      </TableLayoutCaption>

      <TableLayoutContent>
        <TableLayoutHeadRow>
          <TableHead>{t('common:order_number')}</TableHead>
          <TableHead>{t('common:orders.transaction_time')}</TableHead>
          <TableHead>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <span>{t('common:bonus_amount')}</span>
              <span>(</span>
              <CurrencySymbol />
              <span>)</span>
            </span>
          </TableHead>
          <TableHead>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <span>{t('common:total_amount')}</span>
              <span>(</span>
              <CurrencySymbol />
              <span>)</span>
            </span>
          </TableHead>
        </TableLayoutHeadRow>

        <TableLayoutBody>
          {filteredRows.map((row, idx) => (
            <TableRow key={`${row.id}-${idx}`} className="h-14">
              <TableCell>{row.id}</TableCell>
              <TableCell>{formatDateTime(row.createdAt)}</TableCell>
              <TableCell>{formatMoney(row.gift).toFixed(2)}</TableCell>
              <TableCell>{formatMoney(row.amount).toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableLayoutBody>
      </TableLayoutContent>

      <TableLayoutFooter>
        <div className="px-4 py-3 flex justify-between">
          <div className="flex items-center text-zinc-500">
            {t('common:total')}: {isLoading ? '...' : totalItems}
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
