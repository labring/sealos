import { useMemo, useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { Input } from '@sealos/shadcn-ui/input';
import { Button } from '@sealos/shadcn-ui/button';
import { DateRangePicker } from '@sealos/shadcn-ui/date-range-picker';
import { Pagination } from '@sealos/shadcn-ui/pagination';
import { useTranslation } from 'next-i18next';
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
import { InvoicePayload } from '@/types/invoice';

function formatDateTime(iso: Date | string) {
  return formatDate(new Date(iso), 'yyyy-MM-dd HH:mm');
}

export default function InvoiceHistoryView({
  dateRange,
  onDateRangeChange,
  orderIdFilter,
  onOrderIdFilterChange,
  invoiceList,
  isLoading,
  totalItem,
  currentPage,
  totalPages,
  onPageChange,
  toInvoiceDetail,
  onInvoiceClick
}: {
  dateRange: DateRange | undefined;
  onDateRangeChange: (v: DateRange | undefined) => void;
  orderIdFilter: string;
  onOrderIdFilterChange: (v: string) => void;
  invoiceList: InvoicePayload[];
  isLoading: boolean;
  totalItem: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  toInvoiceDetail?: () => void;
  onInvoiceClick?: (invoice: InvoicePayload) => void;
}) {
  const { t } = useTranslation();
  const getStatusDisplay = (status: InvoicePayload['status']) => {
    switch (status) {
      case 'COMPLETED':
        return { text: 'Completed', className: 'text-green-600' };
      case 'PENDING':
        return { text: 'Pending', className: 'text-yellow-600' };
      case 'REJECTED':
        return { text: 'Rejected', className: 'text-red-600' };
      default:
        return { text: status, className: 'text-gray-600' };
    }
  };

  const handleDownload = (invoice: InvoicePayload) => {
    // TODO: Implement download logic
    console.log('Download invoice:', invoice.id);
  };

  return (
    <TableLayout>
      <TableLayoutCaption>
        <div className="flex gap-3 items-center">
          <DateRangePicker
            className="w-fit"
            value={dateRange}
            onChange={onDateRangeChange}
            placeholder={t('common:pick_date_range')}
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
      </TableLayoutCaption>

      <TableLayoutContent>
        <TableLayoutHeadRow>
          <TableHead>{t('common:orders.invoice_request_time')}</TableHead>
          <TableHead>{t('common:orders.invoice_issued_time')}</TableHead>
          <TableHead>{t('common:orders.status_label')}</TableHead>
          <TableHead>{t('common:orders.invoice_amount')}</TableHead>
          <TableHead>{t('common:orders.action')}</TableHead>
        </TableLayoutHeadRow>

        <TableLayoutBody>
          {invoiceList.map((invoice) => {
            const statusDisplay = getStatusDisplay(invoice.status);
            const isCompleted = invoice.status === 'COMPLETED';
            return (
              <TableRow key={invoice.id} className="h-14">
                <TableCell>{formatDateTime(invoice.createdAt)}</TableCell>
                <TableCell>{isCompleted ? formatDateTime(invoice.updatedAt) : '-'}</TableCell>
                <TableCell>
                  <span className={statusDisplay.className}>{statusDisplay.text}</span>
                </TableCell>
                <TableCell>${formatMoney(invoice.totalAmount).toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {isCompleted && (
                      <Button variant="outline" size="sm" onClick={() => handleDownload(invoice)}>
                        {t('common:orders.download')}
                      </Button>
                    )}
                    {toInvoiceDetail && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onInvoiceClick?.(invoice);
                          toInvoiceDetail();
                        }}
                      >
                        {t('common:orders.details')}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableLayoutBody>
      </TableLayoutContent>

      <TableLayoutFooter>
        <div className="px-4 py-3 flex justify-between">
          <div className="flex items-center text-zinc-500">
            {t('common:total')}: {isLoading ? '...' : totalItem}
          </div>
          <div className="flex items-center gap-3">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.max(1, totalPages)}
              onPageChange={onPageChange}
            />
            <span>
              <span>10</span>
              <span className="text-zinc-500"> / {t('common:page')}</span>
            </span>
          </div>
        </div>
      </TableLayoutFooter>
    </TableLayout>
  );
}
