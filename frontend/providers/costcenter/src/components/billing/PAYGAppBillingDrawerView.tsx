import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@sealos/shadcn-ui/drawer';
import { Pagination } from '@sealos/shadcn-ui/pagination';
import { DateRangePicker } from '@sealos/shadcn-ui/date-range-picker';
import { Button } from '@sealos/shadcn-ui/button';
import { Badge } from '@sealos/shadcn-ui/badge';
import { ArrowUpRight } from 'lucide-react';
import { TableHead, TableRow, TableCell } from '@sealos/shadcn-ui/table';
import { cn } from '@sealos/shadcn-ui';
import {
  TableLayout,
  TableLayoutCaption,
  TableLayoutContent,
  TableLayoutHeadRow,
  TableLayoutBody,
  TableLayoutFooter
} from '@sealos/shadcn-ui/table-layout';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef
} from '@tanstack/react-table';
import { useMemo } from 'react';
import { format, addHours } from 'date-fns';
import { useTranslation } from 'next-i18next';
import { AppIcon } from '../AppIcon';
import { AppType } from '@/types/app';
import { formatMoney } from '@/utils/format';

type PAYGBillingDetail = {
  appName: string;
  appType: string;
  time: Date;
  orderId: string;
  namespace: string;
  amount: number;
  usage: Partial<
    Record<
      'cpu' | 'memory' | 'storage' | 'network' | 'port' | 'gpu',
      {
        amount: number;
        cost: number;
      }
    >
  >;
};

type TableRowData = PAYGBillingDetail | { type: 'separator'; time: Date };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appType: string;
  namespace: string;
  hasSubApps: boolean;
  data: PAYGBillingDetail[];
  appName: string;
  region: string;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onOpenApp?: () => void;
  dateRange?: { from: Date; to: Date };
  onDateRangeChange?: (range: { from: Date; to: Date } | undefined) => void;
};

export function PAYGAppBillingDrawerView({
  open,
  onOpenChange,
  hasSubApps,
  data,
  appName,
  appType,
  namespace: _namespace,
  region,
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  onPageChange,
  onOpenApp,
  dateRange,
  onDateRangeChange
}: Props) {
  const { t } = useTranslation('applist');

  // Group data by hour or day based on hasSubApps and add separators
  const tableData: TableRowData[] = useMemo(() => {
    const grouped = data.reduce(
      (acc, item) => {
        let groupKey: string;
        if (hasSubApps) {
          // Group by hour when showing sub-apps
          groupKey = new Date(
            item.time.getFullYear(),
            item.time.getMonth(),
            item.time.getDate(),
            item.time.getHours()
          ).toISOString();
        } else {
          // Group by day when not showing sub-apps
          groupKey = new Date(
            item.time.getFullYear(),
            item.time.getMonth(),
            item.time.getDate()
          ).toISOString();
        }

        if (!acc[groupKey]) {
          acc[groupKey] = [];
        }
        acc[groupKey].push(item);
        return acc;
      },
      {} as Record<string, PAYGBillingDetail[]>
    );

    const result: TableRowData[] = [];
    Object.entries(grouped).forEach(([groupKey, items]) => {
      result.push({ type: 'separator', time: new Date(groupKey) });
      result.push(...items);
    });
    return result;
  }, [data, hasSubApps]);

  const columnHelper = createColumnHelper<TableRowData>();

  const columns: ColumnDef<TableRowData, any>[] = [
    columnHelper.accessor(hasSubApps ? 'appName' : 'time', {
      header: hasSubApps ? 'Sub-app' : 'Time',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row && row.type === 'separator') {
          let timeStr: string;
          if (hasSubApps) {
            // Show hour range for sub-apps
            const startTime = format(row.time, 'yyyy-MM-dd HH:mm');
            const endTime = format(addHours(row.time, 1), 'HH:mm');
            timeStr = `${startTime} - ${endTime}`;
          } else {
            // Show date for non-sub-apps
            timeStr = format(row.time, 'yyyy-MM-dd');
          }
          return (
            <div className="bg-zinc-50 text-gray-900 font-normal" style={{ gridColumn: '1 / -1' }}>
              {timeStr}
            </div>
          );
        }

        if (hasSubApps) {
          // Show app name with avatar for sub-apps
          return (
            <div className="flex gap-2 items-center">
              <AppIcon
                app={'appType' in row ? row.appType : AppType.OTHER}
                className={{ avatar: 'size-5' }}
              />
              <span>{info.getValue()}</span>
            </div>
          );
        } else {
          // Show time for non-sub-apps
          return format(row.time, 'HH:mm');
        }
      }
    }),
    columnHelper.display({
      id: 'cpu-usage',
      header: 'CPU',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.cpu ? `${(row.usage.cpu.amount / 1000).toFixed(6)} Cores` : '-';
      }
    }),
    columnHelper.display({
      id: 'cpu-amount',
      header: 'Amount',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.cpu ? `-$${formatMoney(row.usage.cpu.cost).toFixed(6)}` : '-';
      }
    }),
    columnHelper.display({
      id: 'memory-usage',
      header: 'Memory',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.memory ? `${(row.usage.memory.amount / 1024).toFixed(6)} Gi` : '-';
      }
    }),
    columnHelper.display({
      id: 'memory-amount',
      header: 'Amount',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.memory ? `-$${formatMoney(row.usage.memory.cost).toFixed(6)}` : '-';
      }
    }),
    columnHelper.display({
      id: 'storage-usage',
      header: 'Storage',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.storage ? `${(row.usage.storage.amount / 1024).toFixed(6)} Gi` : '-';
      }
    }),
    columnHelper.display({
      id: 'storage-amount',
      header: 'Amount',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.storage ? `-$${formatMoney(row.usage.storage.cost).toFixed(6)}` : '-';
      }
    }),
    columnHelper.display({
      id: 'network-usage',
      header: 'Traffic',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.network ? `${(row.usage.network.amount / 1024).toFixed(6)} Gi` : '-';
      }
    }),
    columnHelper.display({
      id: 'network-amount',
      header: 'Amount',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.network ? `-$${formatMoney(row.usage.network.cost).toFixed(6)}` : '-';
      }
    }),
    columnHelper.display({
      id: 'port-usage',
      header: 'Port',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.port ? `${(row.usage.port.amount / 1000).toFixed(6)} Ports` : '-';
      }
    }),
    columnHelper.display({
      id: 'port-amount',
      header: 'Amount',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.port ? `-$${formatMoney(row.usage.port.cost).toFixed(6)}` : '-';
      }
    }),
    columnHelper.display({
      id: 'gpu-usage',
      header: 'GPU',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.gpu ? `${row.usage.gpu.amount.toFixed(6)} GPUs` : '-';
      }
    }),
    columnHelper.display({
      id: 'gpu-amount',
      header: 'Amount',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.gpu ? `-$${formatMoney(row.usage.gpu.cost).toFixed(6)}` : '-';
      }
    }),
    columnHelper.display({
      id: 'total-amount',
      header: 'Total Amount',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return `-$${formatMoney(row.amount).toFixed(6)}`;
      }
    })
  ];

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="w-fit sm:max-w-[calc(100vw-24px)]">
        <DrawerHeader className="pr-14">
          <DrawerTitle className="flex items-center gap-8 justify-between w-full">
            <div className="flex gap-2 items-center">
              <AppIcon app={appType} className={{ avatar: 'size-5' }} />
              <span className="text-nowrap">{appName}</span>
              <Badge variant="secondary">{region}</Badge>
              <Badge variant="secondary">{t(appType)}</Badge>
            </div>
            {onOpenApp && (
              <div>
                <Button variant="outline" onClick={onOpenApp}>
                  <span>Open App</span>
                  <ArrowUpRight size={16} />
                </Button>
              </div>
            )}
          </DrawerTitle>
        </DrawerHeader>

        {/* Table */}
        <div className="p-5 max-h-full overflow-y-scroll">
          <TableLayout>
            <TableLayoutCaption className="font-medium text-base">
              <div className="flex gap-2 items-center">
                <h3>Billing & Usage</h3>
                <Badge variant="secondary">Hourly</Badge>
              </div>
              <div>
                <DateRangePicker
                  value={dateRange ? { from: dateRange.from, to: dateRange.to } : undefined}
                  onChange={(range) => {
                    if (range?.from && range?.to && onDateRangeChange) {
                      onDateRangeChange({ from: range.from, to: range.to });
                    } else if (!range && onDateRangeChange) {
                      onDateRangeChange(undefined);
                    }
                  }}
                />
              </div>
            </TableLayoutCaption>

            <TableLayoutContent>
              <TableLayoutHeadRow>
                {table.getHeaderGroups().map((headerGroup) =>
                  headerGroup.headers.map((header, index) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'sticky top-0 z-20 bg-card',
                        index > 0 && index % 2 === 1 && 'border-l',
                        index > 0 && index % 2 === 0 && 'border-r'
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))
                )}
              </TableLayoutHeadRow>

              <TableLayoutBody>
                {table.getRowModel().rows.map((row) => {
                  const rowData = row.original;
                  const isSeparator = 'type' in rowData && rowData.type === 'separator';

                  return (
                    <TableRow key={row.id} className={cn({ 'h-14': !isSeparator })}>
                      {row.getVisibleCells().map((cell, index) => {
                        if (isSeparator) {
                          // Only the first cell in separator row is useful.
                          if (index !== 0) return null;

                          return (
                            <TableCell
                              key={row.id}
                              colSpan={999}
                              className="bg-zinc-50 text-gray-900 font-normal sticky left-0 z-10"
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          );
                        }

                        return (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              index > 0 && index % 2 === 1 && 'border-l',
                              index > 0 && index % 2 === 0 && 'border-r'
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableLayoutBody>
            </TableLayoutContent>

            <TableLayoutFooter>
              <div className="px-4 py-3 flex justify-between">
                <div className="flex items-center text-zinc-500">Total: {totalCount}</div>
                <div className="flex items-center gap-3">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange || (() => {})}
                  />
                  <span>
                    <span>{pageSize}</span>
                    <span className="text-zinc-500"> / Page</span>
                  </span>
                </div>
              </div>
            </TableLayoutFooter>
          </TableLayout>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
