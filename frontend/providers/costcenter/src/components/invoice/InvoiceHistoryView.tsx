import { useMemo, useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { Input } from '@sealos/shadcn-ui/input';
import { Button } from '@sealos/shadcn-ui/button';
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
import { InvoicePayload } from '@/types/invoice';

function formatDateTime(iso: Date | string) {
  return formatDate(new Date(iso), 'yyyy-MM-dd HH:mm');
}

export default function InvoiceHistoryView({
  dateRange,
  onDateRangeChange,
  orderId,
  onOrderIdChange,
  invoiceList,
  isLoading,
  totalItem,
  currentPage,
  totalPages,
  onPageChange,
  toInvoiceDetail
}: {
  dateRange: DateRange | undefined;
  onDateRangeChange: (v: DateRange | undefined) => void;
  orderId: string;
  onOrderIdChange: (v: string) => void;
  invoiceList: InvoicePayload[];
  isLoading: boolean;
  totalItem: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  toInvoiceDetail?: () => void;
}) {
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
            placeholder="PICK DATE RANGE!"
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
      </TableLayoutCaption>

      <TableLayoutContent>
        <TableLayoutHeadRow>
          <TableHead>Invoice Request Time</TableHead>
          <TableHead>Invoice Issued Time</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Invoice Amount</TableHead>
          <TableHead>Action</TableHead>
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
                        Download
                      </Button>
                    )}
                    {toInvoiceDetail && (
                      <Button variant="outline" size="sm" onClick={toInvoiceDetail}>
                        Details
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
            Total: {isLoading ? '...' : totalItem}
          </div>
          <div className="flex items-center gap-3">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.max(1, totalPages)}
              onPageChange={onPageChange}
            />
            <span>
              <span>10</span>
              <span className="text-zinc-500"> / Page</span>
            </span>
          </div>
        </div>
      </TableLayoutFooter>
    </TableLayout>
  );
}
