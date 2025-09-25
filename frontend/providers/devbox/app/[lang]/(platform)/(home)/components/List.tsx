'use client';

import {
  ArrowBigUpDash,
  ArrowDownAZ,
  ArrowUpAZ,
  Check,
  Ellipsis,
  IterationCw,
  Pause,
  PencilLine,
  Play,
  SquareTerminal,
  Trash2,
  ArrowUpWideNarrow,
  ArrowDownWideNarrow
} from 'lucide-react';
import dayjs from 'dayjs';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender,
  type ColumnDef,
  type FilterFn,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState
} from '@tanstack/react-table';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState, useEffect } from 'react';

import { useRouter } from '@/i18n';
import { useDateTimeStore } from '@/stores/date';
import { DevboxListItemTypeV2, DevboxStatusMapType } from '@/types/devbox';
import { DevboxStatusEnum, devboxStatusMap } from '@/constants/devbox';
import { generateMockMonitorData } from '@/constants/mock';
import { useControlDevbox } from '@/hooks/useControlDevbox';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@sealos/shadcn-ui/dropdown-menu';
import IDEButton from '@/components/IDEButton';
import { Button } from '@sealos/shadcn-ui/button';
import MonitorChart from '@/components/MonitorChart';
import DevboxStatusTag from '@/components/StatusTag';
import { Pagination } from '@sealos/shadcn-ui/pagination';
import ReleaseModal from '@/components/dialogs/ReleaseDialog';
import ShutdownModal from '@/components/dialogs/ShutdownDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@sealos/shadcn-ui/tooltip';
import { track } from '@sealos/gtm';
import { Polygon } from '@/components/Polygon';
import DatePicker from '@/components/DatePicker';
import { Separator } from '@sealos/shadcn-ui/separator';
import SearchEmpty from './SearchEmpty';

const DeleteDevboxDialog = dynamic(() => import('@/components/dialogs/DeleteDevboxDialog'));
const EditRemarkDialog = dynamic(() => import('@/components/dialogs/EditRemarkDialog'));

const PAGE_SIZE = 10;

const statusFilterFn: FilterFn<DevboxListItemTypeV2> = (row, columnId, filterValue) => {
  if (!filterValue || filterValue.length === 0) return true;
  const status = row.getValue(columnId) as DevboxStatusMapType;
  return filterValue.some((filter: string) => {
    if (filter === DevboxStatusEnum.Stopped) {
      return (
        status.value === DevboxStatusEnum.Stopped || status.value === DevboxStatusEnum.Shutdown
      );
    }
    return filter === status.value;
  });
};

const dateFilterFn: FilterFn<DevboxListItemTypeV2> = (row, columnId, filterValue) => {
  if (!filterValue || !filterValue.startDateTime || !filterValue.endDateTime) return true;
  const createTime = row.getValue(columnId) as string;
  const createTimeDate = new Date(createTime);
  return createTimeDate >= filterValue.startDateTime && createTimeDate <= filterValue.endDateTime;
};

const DevboxList = ({
  devboxList = [],
  refetchDevboxList,
  searchQuery = ''
}: {
  devboxList: DevboxListItemTypeV2[];
  refetchDevboxList: () => void;
  searchQuery?: string;
}) => {
  const router = useRouter();
  const t = useTranslations();
  const { handleRestartDevbox, handleStartDevbox, handleGoToTerminal } =
    useControlDevbox(refetchDevboxList);

  const { startDateTime: dateRangeStart } = useDateTimeStore();

  // Check if a specific time range is selected (not "all time")
  const isSpecificTimeRangeSelected = useMemo(() => {
    const allTimeStartDate = new Date('1970-01-01T00:00:00Z');
    return dateRangeStart.getTime() !== allTimeStartDate.getTime();
  }, [dateRangeStart]);

  const [onOpenRelease, setOnOpenRelease] = useState(false);
  const [onOpenShutdown, setOnOpenShutdown] = useState(false);
  const [delDevbox, setDelDevbox] = useState<DevboxListItemTypeV2 | null>(null);
  const [currentDevboxListItem, setCurrentDevboxListItem] = useState<DevboxListItemTypeV2 | null>(
    null
  );
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createTime', desc: true }]);
  const [statusFilter, setStatusFilter] = useState<string[]>(() => {
    // Initialize with all available statuses except Shutdown
    return Object.values(devboxStatusMap)
      .filter((status) => status.value !== DevboxStatusEnum.Shutdown)
      .map((status) => status.value);
  });
  const [editRemarkItem, setEditRemarkItem] = useState<DevboxListItemTypeV2 | null>(null);
  const [onOpenEditRemark, setOnOpenEditRemark] = useState(false);
  const handleOpenRelease = useCallback((devbox: DevboxListItemTypeV2) => {
    setCurrentDevboxListItem(devbox);
    setOnOpenRelease(true);
  }, []);

  const columns = useMemo<ColumnDef<DevboxListItemTypeV2>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex cursor-pointer items-center gap-2 select-none hover:text-zinc-800">
                {column.getIsSorted() === 'desc' ? (
                  <ArrowDownAZ className="h-4 w-4 shrink-0 text-blue-600" />
                ) : (
                  <ArrowUpAZ
                    className={`h-4 w-4 shrink-0 ${column.getIsSorted() === 'asc' ? 'text-blue-600' : ''}`}
                  />
                )}
                {t('name')}
                <Polygon
                  fillColor={column.getIsSorted() ? '#2563EB' : '#A1A1AA'}
                  className="h-1.5 w-3 shrink-0"
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <div className="flex items-center px-1 py-1.5 text-xs font-medium text-zinc-500">
                {t('order')}
              </div>
              <DropdownMenuItem
                onClick={() => {
                  if (column.getIsSorted() === 'asc') {
                    column.clearSorting();
                  } else {
                    column.toggleSorting(false);
                  }
                }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ArrowUpAZ className="h-4 w-4 shrink-0" />
                  {t('sort.asc')}
                </div>
                {column.getIsSorted() === 'asc' && <Check className="h-4 w-4 text-blue-600" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (column.getIsSorted() === 'desc') {
                    column.clearSorting();
                  } else {
                    column.toggleSorting(true);
                  }
                }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ArrowDownAZ className="h-4 w-4 shrink-0" />
                  {t('sort.desc')}
                </div>
                {column.getIsSorted() === 'desc' && <Check className="h-4 w-4 text-blue-600" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        size: 250,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex w-full cursor-pointer items-center gap-2 pr-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-8 min-w-8 items-center justify-center rounded-lg border-[0.5px] border-zinc-200 bg-zinc-50">
                    <Image
                      width={21}
                      height={21}
                      alt={item.id}
                      src={`/images/runtime/${item.template.templateRepository.iconId}.svg`}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" sideOffset={1}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border-[0.5px] border-zinc-200 bg-zinc-50">
                      <Image
                        width={21}
                        height={21}
                        alt={item.id}
                        src={`/images/runtime/${item.template.templateRepository.iconId}.svg`}
                      />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-sm/5 font-medium">
                        {item.template.templateRepository.iconId}
                      </p>
                      <p className="text-xs/5 text-zinc-500">{item.template.name}</p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex w-full flex-1 flex-col leading-none">
                    <div className="group flex items-center gap-1">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {item.name}
                      </span>

                      {!item.remark && (
                        <div
                          className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity select-none group-hover:opacity-100"
                          onClick={() => {
                            setOnOpenEditRemark(true);
                            setEditRemarkItem(item);
                          }}
                        >
                          <PencilLine className="h-4 min-h-4 w-4 min-w-4 cursor-pointer text-neutral-500" />
                          <span className="text-sm text-zinc-500">{t('set_remarks')}</span>
                        </div>
                      )}
                    </div>
                    {item.remark && (
                      <div className="group flex w-[80%] items-center gap-1">
                        <span className="truncate text-xs font-normal text-zinc-500">
                          {item.remark}
                        </span>
                        <PencilLine
                          className="h-4 min-h-4 w-4 min-w-4 cursor-pointer text-neutral-500 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => {
                            setOnOpenEditRemark(true);
                            setEditRemarkItem(item);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="start"
                  className="mr-25 flex w-fit max-w-60 flex-col gap-2 p-4 text-sm/5"
                >
                  <div>
                    <div className="flex w-full gap-2">
                      <span className="min-w-15 text-zinc-600">{t('name')}</span>
                      <span className="break-all text-zinc-900">{item.name}</span>
                    </div>
                    {!!item.remark && (
                      <>
                        <Separator className="bg-zinc-100" />
                        <div className="flex w-full gap-2">
                          <span className="min-w-15 text-zinc-600">{t('remark')}</span>
                          <div className="break-all text-zinc-900">{item.remark}</div>
                        </div>
                      </>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          );
        }
      },
      {
        accessorKey: 'status',
        enableColumnFilter: true,
        filterFn: statusFilterFn,
        header: ({ column, table }) => {
          const currentData = table.getCoreRowModel().rows.map((row) => row.original);

          const existingStatuses = new Set(
            currentData.map((item) =>
              item.status.value === DevboxStatusEnum.Shutdown
                ? DevboxStatusEnum.Stopped
                : item.status.value
            )
          );

          const statusOptions = Object.values(devboxStatusMap).filter((status) => {
            if (status.value === DevboxStatusEnum.Shutdown) return false;
            if (status.value === DevboxStatusEnum.Stopped) {
              return existingStatuses.has(DevboxStatusEnum.Stopped);
            }
            return existingStatuses.has(status.value);
          }) as DevboxStatusMapType[];

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex cursor-pointer items-center gap-2 hover:text-zinc-800">
                  {t('status')}
                  <Polygon
                    fillColor={
                      Object.values(devboxStatusMap)
                        .filter((status) => status.value !== DevboxStatusEnum.Shutdown)
                        .map((status) => status.value)
                        .every((value) => statusFilter.includes(value))
                        ? '#A1A1AA'
                        : '#2563EB'
                    }
                    className="h-1.5 w-3 shrink-0"
                  />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <div className="flex items-center px-1 py-1.5 text-xs font-medium text-zinc-500 select-none">
                  {t('status')}
                </div>
                {statusOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    className="flex w-full cursor-pointer items-center justify-between px-2 py-1.5"
                    onClick={() => {
                      const isSelected = statusFilter.includes(option.value);
                      setStatusFilter(
                        isSelected
                          ? statusFilter.filter((value) => value !== option.value)
                          : [...statusFilter, option.value]
                      );
                    }}
                  >
                    <DevboxStatusTag status={option} className="font-normal" />
                    {statusFilter.includes(option.value) && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <DevboxStatusTag
              status={item.status}
              isShutdown={item.status.value === DevboxStatusEnum.Shutdown}
            />
          );
        }
      },
      {
        accessorKey: 'cpu',
        header: ({ column }) => <span className="select-none">{t('cpu')}</span>,
        size: 256,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <MonitorChart
              type="blue"
              data={item.usedCpu || generateMockMonitorData(item.name)}
              className="h-9 w-55"
            />
          );
        }
      },
      {
        accessorKey: 'memory',
        header: ({ column }) => <span className="select-none">{t('memory')}</span>,
        size: 256,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <MonitorChart
              type="green"
              data={item.usedMemory || generateMockMonitorData(item.name)}
              className="h-9 w-55"
            />
          );
        }
      },
      {
        accessorKey: 'createTime',
        enableColumnFilter: true,
        filterFn: dateFilterFn,
        header: ({ column }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex cursor-pointer items-center gap-2 hover:text-zinc-800">
                {column.getIsSorted() === 'asc' ? (
                  <ArrowUpWideNarrow className="h-4 w-4 shrink-0 text-blue-600" />
                ) : isSpecificTimeRangeSelected ? (
                  <ArrowDownWideNarrow className="h-4 w-4 shrink-0 text-blue-600" />
                ) : (
                  <ArrowDownWideNarrow className="h-4 w-4 shrink-0" />
                )}
                <span className="select-none">{t('create_time')}</span>
                <Polygon
                  fillColor={
                    column.getIsSorted() === 'asc' || isSpecificTimeRangeSelected
                      ? '#2563EB'
                      : '#A1A1AA'
                  }
                  className="h-1.5 w-3 shrink-0"
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[290px]">
              <div className="flex items-center px-1 py-1.5 text-xs font-medium text-zinc-500">
                {t('time_range')}
              </div>
              <div className="p-2">
                <DatePicker />
              </div>
              <DropdownMenuSeparator />
              <div className="flex items-center px-1 py-1.5 text-xs font-medium text-zinc-500">
                {t('order')}
              </div>
              <DropdownMenuItem
                onClick={() => column.toggleSorting(false)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ArrowUpWideNarrow className="mr-2 h-4 w-4 text-zinc-500" />
                  {t('oldest_first')}
                </div>
                {column.getIsSorted() === 'asc' && <Check className="h-4 w-4 text-blue-600" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => column.toggleSorting(true)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ArrowDownWideNarrow className="mr-2 h-4 w-4 text-zinc-500" />
                  {t('newest_first')}
                </div>
                {column.getIsSorted() === 'desc' && <Check className="h-4 w-4 text-blue-600" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        size: 150,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <span className="text-sm text-zinc-600">
              {dayjs(item.createTime).format('YYYY/MM/DD HH:mm')}
            </span>
          );
        }
      },
      {
        id: 'actions',
        header: ({ column }) => <span className="select-none">{t('action')}</span>,
        size: 300,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center justify-start gap-2">
              <IDEButton
                devboxName={item.name}
                sshPort={item.sshPort}
                status={item.status}
                runtimeType={item.template.templateRepository.iconId as string}
                leftButtonProps={{
                  className: 'border-r-1 w-36 rounded-r-none px-2'
                }}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  router.push(`/devbox/detail/${item.name}`);
                  track({
                    event: 'deployment_details',
                    module: 'devbox',
                    context: 'app'
                  });
                }}
              >
                {t('detail')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Ellipsis className="h-4 w-4 text-zinc-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem className="h-9" onClick={() => handleOpenRelease(item)}>
                    <ArrowBigUpDash className="h-4 w-4 text-neutral-500" />
                    {t('release')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="h-9"
                    disabled={item.status.value !== 'Running'}
                    onClick={() => handleGoToTerminal(item)}
                  >
                    <SquareTerminal className="h-4 w-4 text-neutral-500" />
                    {t('terminal')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex h-9 cursor-pointer items-center rounded-md px-3 text-sm"
                    onClick={() => router.push(`/devbox/create?name=${item.name}&from=list`)}
                  >
                    <PencilLine className="h-4 w-4 text-neutral-500" />
                    {t('update')}
                  </DropdownMenuItem>
                  {(item.status.value === 'Stopped' || item.status.value === 'Shutdown') && (
                    <DropdownMenuItem
                      className="flex h-9 cursor-pointer items-center rounded-md px-3 text-sm"
                      onClick={() => handleStartDevbox(item)}
                    >
                      <Play className="h-4 w-4 text-neutral-500" />
                      {t('start')}
                    </DropdownMenuItem>
                  )}
                  {item.status.value !== 'Stopped' && item.status.value !== 'Shutdown' && (
                    <DropdownMenuItem
                      className="flex h-9 cursor-pointer items-center rounded-md px-3 text-sm"
                      onClick={() => handleRestartDevbox(item)}
                    >
                      <IterationCw className="h-4 w-4 text-neutral-500" />
                      {t('restart')}
                    </DropdownMenuItem>
                  )}
                  {item.status.value === 'Running' && (
                    <DropdownMenuItem
                      className="flex h-9 cursor-pointer items-center rounded-md px-3 text-sm"
                      onClick={() => {
                        setOnOpenShutdown(true);
                        setCurrentDevboxListItem(item);
                      }}
                    >
                      <Pause className="h-4 w-4 text-neutral-500" />
                      {t('shutdown')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    className="flex h-9 cursor-pointer items-center rounded-md px-3 text-sm"
                    onClick={() => setDelDevbox(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        }
      }
    ],
    // NOTE: do not add devboxList dependency, it will cause infinite re-render
    [statusFilter, isSpecificTimeRangeSelected]
  );

  const { startDateTime } = useDateTimeStore();
  const [endDateTime, setEndDateTime] = useState(new Date());

  useEffect(() => {
    const updateEndDateTime = () => {
      setEndDateTime(new Date());
    };
    updateEndDateTime();
  }, [devboxList]);

  const globalFilterFn: FilterFn<DevboxListItemTypeV2> = (row, columnId, filterValue) => {
    const searchTerm = filterValue.toLowerCase();
    const name = row.original.name.toLowerCase();
    const remark = (row.original.remark || '').toLowerCase();
    return name.includes(searchTerm) || remark.includes(searchTerm);
  };

  const table = useReactTable({
    data: devboxList,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
      globalFilter: searchQuery,
      columnFilters: [
        { id: 'status', value: statusFilter },
        { id: 'createTime', value: { startDateTime, endDateTime } }
      ]
    },
    filterFns: {
      status: statusFilterFn,
      date: dateFilterFn,
      global: globalFilterFn
    },
    globalFilterFn: globalFilterFn,
    initialState: {
      pagination: {
        pageSize: PAGE_SIZE
      }
    },
    enableMultiSort: true,
    // NOTE: this option may cause some bug,but the probability is very small,maybe we should test it carefully.
    autoResetPageIndex: false
  });

  return (
    <>
      {/* table */}
      <div className="flex h-full w-full flex-col justify-between">
        <div className="flex h-full flex-col gap-3">
          {/* table header */}
          <div className="flex h-10 items-center rounded-lg border-[0.5px] bg-white px-6 py-1 text-sm/5 text-zinc-500 shadow-[0px_2px_8px_-2px_rgba(0,0,0,0.08)]">
            {table.getFlatHeaders().map((header) => (
              <div
                key={header.id}
                style={{ width: header.getSize() }}
                className="flex-shrink-0 flex-grow-1"
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
              </div>
            ))}
          </div>
          {/* table body */}
          {table.getRowModel().rows.length === 0 ? (
            <SearchEmpty />
          ) : (
            table.getRowModel().rows.map((row) => (
              <div
                key={row.id}
                className="flex h-16 items-center rounded-xl border-[0.5px] bg-white px-6 shadow-[0px_2px_8px_-2px_rgba(0,0,0,0.08)] transition-colors"
                data-id={row.original.id}
              >
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                    className="flex-shrink-0 flex-grow-1"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
        {/* pagination */}
        {table.getRowModel().rows.length > 0 && (
          <div className="flex items-center justify-between gap-2.5 pt-2 text-sm/5 text-zinc-500">
            <span>{t('Total') + ': ' + table.getFilteredRowModel().rows.length}</span>
            <div className="flex items-center gap-3">
              <Pagination
                currentPage={table.getState().pagination.pageIndex + 1}
                totalPages={table.getPageCount()}
                onPageChange={(page) => table.setPageIndex(page - 1)}
              />
              <div className="flex items-center gap-1">
                <span className="text-zinc-900">{table.getState().pagination.pageSize}</span>/
                <span>{t('Page')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* dialogs */}
      {!!delDevbox && (
        <DeleteDevboxDialog
          devbox={delDevbox}
          onClose={() => setDelDevbox(null)}
          onSuccess={refetchDevboxList}
          refetchDevboxList={refetchDevboxList}
        />
      )}

      {!!currentDevboxListItem && (
        <ReleaseModal
          open={!!onOpenRelease}
          onSuccess={() => {
            router.push(`/devbox/detail/${currentDevboxListItem.name}`);
          }}
          onClose={() => {
            setOnOpenRelease(false);
            setCurrentDevboxListItem(null);
          }}
          devbox={currentDevboxListItem}
        />
      )}
      {!!currentDevboxListItem && (
        <ShutdownModal
          open={!!onOpenShutdown}
          onSuccess={() => {
            refetchDevboxList();
            setOnOpenShutdown(false);
          }}
          onClose={() => {
            setOnOpenShutdown(false);
          }}
          devbox={currentDevboxListItem}
        />
      )}
      {!!editRemarkItem && (
        <EditRemarkDialog
          open={!!onOpenEditRemark}
          onSuccess={() => {
            refetchDevboxList();
            setOnOpenEditRemark(false);
            setEditRemarkItem(null);
          }}
          onClose={() => {
            setOnOpenEditRemark(false);
            setEditRemarkItem(null);
          }}
          devboxName={editRemarkItem.name}
          currentRemark={editRemarkItem.remark}
        />
      )}
    </>
  );
};

export default DevboxList;
