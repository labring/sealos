import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@sealos/shadcn-ui/drawer';
import { Pagination } from '@sealos/shadcn-ui/pagination';
import { DateRangePicker } from '@sealos/shadcn-ui/date-range-picker';
import { Button } from '@sealos/shadcn-ui/button';
import { Badge } from '@sealos/shadcn-ui/badge';
import { Skeleton } from '@sealos/shadcn-ui/skeleton';
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
import { useMemo, useState, useEffect } from 'react';
import { format, addHours } from 'date-fns';
import { useTranslation } from 'next-i18next';
import { AppIcon } from '../AppIcon';
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

type TableRowData =
  | { type: 'data'; data: PAYGBillingDetail }
  | { type: 'separator'; time: Date }
  | { type: 'skeleton' };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appType: string;
  namespaceName: string;
  hasSubApps: boolean;
  data: PAYGBillingDetail[];
  appName: string;
  regionName: string;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onOpenApp?: () => void;
  dateRange?: { from: Date; to: Date };
  onDateRangeChange?: (range: { from: Date; to: Date } | undefined) => void;
  isLoading?: boolean;
};

export function PAYGAppBillingDrawerView({
  open,
  onOpenChange,
  hasSubApps,
  data,
  appName,
  appType,
  namespaceName,
  regionName,
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  onPageChange,
  onOpenApp,
  dateRange,
  onDateRangeChange,
  isLoading = false
}: Props) {
  const { t } = useTranslation('applist');

  // Preserve last valid total page to prevent reset to 1 during loading
  const [stableTotalPages, setStableTotalPages] = useState(totalPages);

  useEffect(() => {
    if (!isLoading && totalPages > 0) {
      setStableTotalPages(totalPages);
    }
  }, [totalPages, isLoading]);

  // Create skeleton data for loading state
  const skeletonData: TableRowData[] = useMemo(() => {
    if (!isLoading) return [];

    // Create skeleton rows based on page size
    return Array.from({ length: pageSize }, () => ({ type: 'skeleton' as const }));
  }, [isLoading, pageSize]);

  // Group data by hour or day based on hasSubApps and add separators
  const tableData: TableRowData[] = useMemo(() => {
    if (isLoading) {
      return skeletonData;
    }

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
      result.push(...items.map((item) => ({ type: 'data' as const, data: item })));
    });
    return result;
  }, [data, hasSubApps, isLoading, skeletonData]);

  const columnHelper = createColumnHelper<TableRowData>();

  // Helper function to render usage cells
  const renderUsageCell = (
    row: TableRowData,
    resourceType: 'cpu' | 'memory' | 'storage' | 'network' | 'port' | 'gpu',
    unitTransform?: (amount: number) => string
  ) => {
    switch (row.type) {
      case 'skeleton':
        return <Skeleton className="h-4 w-16" />;
      case 'separator':
        return null;
      case 'data': {
        const usage = row.data.usage[resourceType];
        if (!usage) return '-';
        const amount = unitTransform ? unitTransform(usage.amount) : usage.amount.toFixed(6);
        return `${amount}`;
      }
      default:
        return null;
    }
  };

  // Helper function to render amount cells
  const renderAmountCell = (
    row: TableRowData,
    resourceType: 'cpu' | 'memory' | 'storage' | 'network' | 'port' | 'gpu'
  ) => {
    switch (row.type) {
      case 'skeleton':
        return <Skeleton className="h-4 w-20" />;
      case 'separator':
        return null;
      case 'data': {
        const usage = row.data.usage[resourceType];
        return usage ? `-$${formatMoney(usage.cost).toFixed(6)}` : '-';
      }
      default:
        return null;
    }
  };

  const columns: ColumnDef<TableRowData, any>[] = [
    columnHelper.display({
      id: hasSubApps ? 'app-name' : 'time',
      header: hasSubApps ? 'Sub-app' : 'Time',
      cell: (info) => {
        const row = info.row.original;

        switch (row.type) {
          case 'skeleton':
            return hasSubApps ? (
              <div className="flex gap-2 items-center">
                <Skeleton className="size-5 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <Skeleton className="h-4 w-16" />
            );

          case 'separator':
            const timeStr = hasSubApps
              ? `${format(row.time, 'yyyy-MM-dd HH:mm')} - ${format(
                  addHours(row.time, 1),
                  'HH:mm'
                )}`
              : format(row.time, 'yyyy-MM-dd');
            return (
              <div
                className="bg-zinc-50 text-gray-900 font-normal"
                style={{ gridColumn: '1 / -1' }}
              >
                {timeStr}
              </div>
            );

          case 'data':
            return hasSubApps ? (
              <div className="flex gap-2 items-center">
                <AppIcon app={row.data.appType} className={{ avatar: 'size-5' }} />
                <span>{row.data.appName}</span>
              </div>
            ) : (
              format(row.data.time, 'HH:mm')
            );

          default:
            return null;
        }
      }
    }),
    columnHelper.display({
      id: 'cpu-usage',
      header: 'CPU',
      cell: (info) =>
        renderUsageCell(info.row.original, 'cpu', (amount) => `${(amount / 1000).toFixed(6)} Cores`)
    }),
    columnHelper.display({
      id: 'cpu-amount',
      header: 'Amount',
      cell: (info) => renderAmountCell(info.row.original, 'cpu')
    }),
    columnHelper.display({
      id: 'memory-usage',
      header: 'Memory',
      cell: (info) =>
        renderUsageCell(info.row.original, 'memory', (amount) => `${(amount / 1024).toFixed(6)} Gi`)
    }),
    columnHelper.display({
      id: 'memory-amount',
      header: 'Amount',
      cell: (info) => renderAmountCell(info.row.original, 'memory')
    }),
    columnHelper.display({
      id: 'storage-usage',
      header: 'Storage',
      cell: (info) =>
        renderUsageCell(
          info.row.original,
          'storage',
          (amount) => `${(amount / 1024).toFixed(6)} Gi`
        )
    }),
    columnHelper.display({
      id: 'storage-amount',
      header: 'Amount',
      cell: (info) => renderAmountCell(info.row.original, 'storage')
    }),
    columnHelper.display({
      id: 'network-usage',
      header: 'Traffic',
      cell: (info) =>
        renderUsageCell(
          info.row.original,
          'network',
          (amount) => `${(amount / 1024).toFixed(6)} Gi`
        )
    }),
    columnHelper.display({
      id: 'network-amount',
      header: 'Amount',
      cell: (info) => renderAmountCell(info.row.original, 'network')
    }),
    columnHelper.display({
      id: 'port-usage',
      header: 'Port',
      cell: (info) =>
        renderUsageCell(
          info.row.original,
          'port',
          (amount) => `${(amount / 1000).toFixed(6)} Ports`
        )
    }),
    columnHelper.display({
      id: 'port-amount',
      header: 'Amount',
      cell: (info) => renderAmountCell(info.row.original, 'port')
    }),
    columnHelper.display({
      id: 'gpu-usage',
      header: 'GPU',
      cell: (info) =>
        renderUsageCell(info.row.original, 'gpu', (amount) => `${amount.toFixed(6)} GPUs`)
    }),
    columnHelper.display({
      id: 'gpu-amount',
      header: 'Amount',
      cell: (info) => renderAmountCell(info.row.original, 'gpu')
    }),
    columnHelper.display({
      id: 'total-amount',
      header: 'Total Amount',
      cell: (info) => {
        const row = info.row.original;
        switch (row.type) {
          case 'skeleton':
            return <Skeleton className="h-4 w-20" />;
          case 'separator':
            return null;
          case 'data':
            return `-$${formatMoney(row.data.amount).toFixed(6)}`;
          default:
            return null;
        }
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
              <Badge variant="secondary">{regionName + ' / ' + namespaceName}</Badge>
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
                        index > 0 && index % 2 === 1 && 'border-l pl-4 pr-2 text-center',
                        index > 0 && index % 2 === 0 && 'border-r pl-2 pr-4 text-center'
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
                  const isSeparator = rowData.type === 'separator';

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
                              index > 0 && index % 2 === 1 && 'border-l pl-4 pr-2 text-center',
                              index > 0 && index % 2 === 0 && 'border-r pl-2 pr-4 text-center'
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
                <div className="flex items-center text-zinc-500">
                  Total:{' '}
                  {isLoading ? <Skeleton className="h-4 w-8 inline-block ml-1" /> : totalCount}
                </div>
                <div className="flex items-center gap-3">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={stableTotalPages}
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
