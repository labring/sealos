import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter
} from '@sealos/shadcn-ui/drawer';
import { Pagination } from '@sealos/shadcn-ui/pagination';
import { DateRangePicker } from '@sealos/shadcn-ui/date-range-picker';
import { Avatar, AvatarFallback } from '@sealos/shadcn-ui/avatar';
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

type PAYGBillingDetail = {
  appName: string;
  appType: 'devbox' | 'applaunchpad';
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

export function PAYGAppBillingDrawer({ open }: { open: boolean }) {
  // Mock data - replace with actual data
  const mockData: PAYGBillingDetail[] = useMemo(
    () => [
      {
        appName: 'App Name',
        appType: 'applaunchpad',
        time: new Date('2025-08-27T15:00:00'),
        orderId: 'order-123',
        namespace: 'default',
        amount: 1200000,
        usage: {
          cpu: { amount: 1600, cost: 200000 },
          memory: { amount: 1600, cost: 200000 },
          storage: { amount: 1600, cost: 200000 },
          network: { amount: 1600, cost: 200000 },
          port: { amount: 2, cost: 200000 },
          gpu: { amount: 2, cost: 200000 }
        }
      },
      {
        appName: 'App Name 2',
        appType: 'devbox',
        time: new Date('2025-08-27T15:00:00'),
        orderId: 'order-124',
        namespace: 'default',
        amount: 600000,
        usage: {
          cpu: { amount: 800, cost: 100000 },
          memory: { amount: 800, cost: 100000 }
          // storage, network, port, gpu are optional and not provided
        }
      }
    ],
    []
  );

  // Group data by hour and add separators
  const tableData: TableRowData[] = useMemo(() => {
    const grouped = mockData.reduce(
      (acc, item) => {
        const hourKey = new Date(
          item.time.getFullYear(),
          item.time.getMonth(),
          item.time.getDate(),
          item.time.getHours()
        ).toISOString();
        if (!acc[hourKey]) {
          acc[hourKey] = [];
        }
        acc[hourKey].push(item);
        return acc;
      },
      {} as Record<string, PAYGBillingDetail[]>
    );

    const result: TableRowData[] = [];
    Object.entries(grouped).forEach(([hourKey, items]) => {
      result.push({ type: 'separator', time: new Date(hourKey) });
      result.push(...items);
    });
    return result;
  }, [mockData]);

  const columnHelper = createColumnHelper<TableRowData>();

  const columns: ColumnDef<TableRowData, any>[] = [
    columnHelper.accessor('appName', {
      header: 'Sub-app',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row && row.type === 'separator') {
          const startTime = format(row.time, 'yyyy-MM-dd HH:mm');
          const endTime = format(addHours(row.time, 1), 'HH:mm');
          const timeStr = `${startTime} - ${endTime}`;
          return (
            <div
              className="bg-zinc-50 text-gray-900 py-2 px-4 font-medium"
              style={{ gridColumn: '1 / -1' }}
            >
              {timeStr}
            </div>
          );
        }
        return (
          <div className="flex gap-2 items-center">
            <Avatar className="size-6">
              <AvatarFallback>A</AvatarFallback>
            </Avatar>
            <span>{info.getValue()}</span>
          </div>
        );
      }
    }),
    columnHelper.display({
      id: 'cpu-usage',
      header: 'CPU',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.cpu ? `${row.usage.cpu.amount / 1000} Cores` : '-';
      }
    }),
    columnHelper.display({
      id: 'cpu-amount',
      header: 'Amount',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.cpu ? `-$${(row.usage.cpu.cost / 100000).toString()}` : '-';
      }
    }),
    columnHelper.display({
      id: 'memory-usage',
      header: 'Memory',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.memory ? `${row.usage.memory.amount / 1000} Gi` : '-';
      }
    }),
    columnHelper.display({
      id: 'memory-amount',
      header: 'Amount',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.memory ? `-$${(row.usage.memory.cost / 100000).toString()}` : '-';
      }
    }),
    columnHelper.display({
      id: 'storage-usage',
      header: 'Storage',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.storage ? `${row.usage.storage.amount / 1000} Gi` : '-';
      }
    }),
    columnHelper.display({
      id: 'storage-amount',
      header: 'Amount',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.storage ? `-$${(row.usage.storage.cost / 100000).toString()}` : '-';
      }
    }),
    columnHelper.display({
      id: 'network-usage',
      header: 'Traffic',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.network ? `${row.usage.network.amount / 1000} Gi` : '-';
      }
    }),
    columnHelper.display({
      id: 'network-amount',
      header: 'Amount',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.network ? `-$${(row.usage.network.cost / 100000).toString()}` : '-';
      }
    }),
    columnHelper.display({
      id: 'port-usage',
      header: 'Port',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.port ? `${row.usage.port.amount} Ports` : '-';
      }
    }),
    columnHelper.display({
      id: 'port-amount',
      header: 'Amount',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.port ? `-$${(row.usage.port.cost / 100000).toString()}` : '-';
      }
    }),
    columnHelper.display({
      id: 'gpu-usage',
      header: 'GPU',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.gpu ? `${row.usage.gpu.amount} GPUs` : '-';
      }
    }),
    columnHelper.display({
      id: 'gpu-amount',
      header: 'Amount',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return row.usage.gpu ? `-$${(row.usage.gpu.cost / 100000).toString()}` : '-';
      }
    }),
    columnHelper.display({
      id: 'total-amount',
      header: 'Total Amount',
      cell: (info) => {
        const row = info.row.original;
        if ('type' in row) return null;
        return `-$${(row.amount / 100000).toString()}`;
      }
    })
  ];

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <Drawer open={open}>
      <DrawerContent className="w-fit sm:max-w-[calc(100vw-24px)]">
        <DrawerHeader className="pr-14">
          <DrawerTitle className="flex items-center gap-8 justify-between w-full">
            <div className="flex gap-2 items-center">
              <Avatar className="size-6">
                <AvatarFallback>A</AvatarFallback>
              </Avatar>
              <span className="text-nowrap">App Name</span>
              <Badge variant="secondary">Hangzhou/Sealos-test</Badge>
              <Badge variant="secondary">App Launchpad</Badge>
            </div>
            <div>
              <Button variant="outline">
                <span>Open App</span>
                <ArrowUpRight size={16} />
              </Button>
            </div>
          </DrawerTitle>
        </DrawerHeader>

        {/* Table */}
        <div className="p-5">
          <TableLayout>
            <TableLayoutCaption className="font-medium text-base">
              <div className="flex gap-2 items-center">
                <h3>Billing & Usage</h3>
                <Badge variant="secondary">Hourly</Badge>
              </div>
              <div>
                <DateRangePicker />
              </div>
            </TableLayoutCaption>

            <TableLayoutContent>
              <TableLayoutHeadRow>
                {table.getHeaderGroups().map((headerGroup) =>
                  headerGroup.headers.map((header, index) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'bg-transparent',
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

                  if (isSeparator) {
                    const startTime = format(rowData.time, 'yyyy-MM-dd HH:mm');
                    const endTime = format(addHours(rowData.time, 1), 'HH:mm');
                    const timeStr = `${startTime} - ${endTime}`;
                    return (
                      <TableRow key={row.id}>
                        <TableCell colSpan={999} className="bg-zinc-50 text-gray-900 font-medium">
                          {timeStr}
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow key={row.id} className="h-14">
                      {row.getVisibleCells().map((cell, index) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            index > 0 && index % 2 === 1 && 'border-l',
                            index > 0 && index % 2 === 0 && 'border-r'
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableLayoutBody>

              <TableLayoutFooter>
                <div className="px-4 py-3 flex justify-between">
                  <div className="flex items-center text-zinc-500">Total: 101</div>
                  <div className="flex items-center gap-3">
                    <Pagination currentPage={1} totalPages={20} onPageChange={() => {}} />
                    <span>
                      <span>8</span>
                      <span className="text-zinc-500"> / Page</span>
                    </span>
                  </div>
                </div>
              </TableLayoutFooter>
            </TableLayoutContent>
          </TableLayout>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
