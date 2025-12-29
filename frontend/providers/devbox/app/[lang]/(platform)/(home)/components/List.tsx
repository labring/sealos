'use client';

import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender,
  type ColumnDef,
  type FilterFn,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  type HeaderContext,
  type CellContext
} from '@tanstack/react-table';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState, memo } from 'react';

import { useRouter } from '@/i18n';
import { useDateTimeStore } from '@/stores/date';
import { usePriceStore } from '@/stores/price';
import { DevboxListItemTypeV2, DevboxStatusMapType } from '@/types/devbox';
import { DevboxStatusEnum, devboxStatusMap } from '@/constants/devbox';
import { useControlDevbox } from '@/hooks/useControlDevbox';

import { Pagination } from '@sealos/shadcn-ui/pagination';
import ReleaseModal from '@/components/dialogs/ReleaseDialog';
import ShutdownModal from '@/components/dialogs/ShutdownDialog';
import SimpleShutdownDialog from '@/components/dialogs/SimpleShutdownDialog';
import SearchEmpty from './SearchEmpty';
import { Name as NameColumn } from './list/columns/Name';
import { Status as StatusColumn } from './list/columns/Status';
import { Monitor as MonitorColumn } from './list/columns/Monitor';
import { CreateTime as CreateTimeColumn } from './list/columns/CreateTime';
import { Actions as ActionsColumn } from './list/columns/Actions';
import { Name as NameHeader } from './list/headers/Name';
import { StatusFilter } from './list/headers/StatusFilter';
import { CreateTimeFilter } from './list/headers/CreateTimeFilter';
import GPUItem from '@/components/GPUItem';

const DeleteDevboxDialog = dynamic(() => import('@/components/dialogs/DeleteDevboxDialog'));
const EditRemarkDialog = dynamic(() => import('@/components/dialogs/EditRemarkDialog'));

const PAGE_SIZE = 10;

const statusFilterFn: FilterFn<DevboxListItemTypeV2> = (row, columnId, filterValue) => {
  if (!filterValue || filterValue.length === 0) return true;
  const status = row.getValue(columnId) as DevboxStatusMapType;
  if (!status || !status.value) return false;

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

  // Check if it's "all time" range (startDateTime is 1970-01-01)
  const allTimeStartDate = new Date('1970-01-01T00:00:00Z');
  const isAllTimeRange = filterValue.startDateTime.getTime() === allTimeStartDate.getTime();

  // For "all time" range, use current time as upper bound to include newly created devboxes
  const effectiveEndDateTime = isAllTimeRange ? new Date() : filterValue.endDateTime;

  return createTimeDate >= filterValue.startDateTime && createTimeDate <= effectiveEndDateTime;
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
  const { sourcePrice } = usePriceStore();

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
  const [statusFilter, setStatusFilter] = useState<DevboxStatusEnum[]>(() => {
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

  const handleEditRemark = useCallback((item: DevboxListItemTypeV2) => {
    setOnOpenEditRemark(true);
    setEditRemarkItem(item);
  }, []);

  const handleOpenShutdownModal = useCallback((item: DevboxListItemTypeV2) => {
    setOnOpenShutdown(true);
    setCurrentDevboxListItem(item);
  }, []);

  const handleDeleteDevbox = useCallback((item: DevboxListItemTypeV2) => {
    setDelDevbox(item);
  }, []);

  const columns = useMemo<ColumnDef<DevboxListItemTypeV2>[]>(
    () => [
      {
        accessorKey: 'name',
        header: NameHeader,
        size: 220,
        cell: (props: CellContext<DevboxListItemTypeV2, unknown>) => <NameColumn {...props} onEditRemark={handleEditRemark} />
      },
      {
        accessorKey: 'status',
        enableColumnFilter: true,
        filterFn: statusFilterFn,
        size: 120,
        header: (props: HeaderContext<DevboxListItemTypeV2, unknown>) => (
          <StatusFilter
            {...props}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        ),
        cell: StatusColumn
      },
      {
        accessorKey: 'cpu',
        header: () => <span className="select-none">{t('cpu')}</span>,
        size: 200,
        cell: (props: CellContext<DevboxListItemTypeV2, unknown>) => <MonitorColumn {...props} type="cpu" />
      },
      {
        accessorKey: 'memory',
        header: () => <span className="select-none">{t('memory')}</span>,
        size: 200,
        cell: (props: CellContext<DevboxListItemTypeV2, unknown>) => <MonitorColumn {...props} type="memory" />
      },
      {
        accessorKey: 'gpu',
        header: ({ column }: HeaderContext<DevboxListItemTypeV2, unknown>) => <span className="select-none">GPU</span>,
        size: 150,
        cell: ({ row }: CellContext<DevboxListItemTypeV2, unknown>) => {
          const item = row.original;
          return (
            <div className="overflow-hidden pr-4">
              <GPUItem gpu={item.gpu} />
            </div>
          );
        }
      },
      {
        accessorKey: 'createTime',
        enableColumnFilter: true,
        filterFn: dateFilterFn,
        header: (props: HeaderContext<DevboxListItemTypeV2, unknown>) => (
          <CreateTimeFilter {...props} isSpecificTimeRangeSelected={isSpecificTimeRangeSelected} />
        ),
        size: 150,
        cell: CreateTimeColumn
      },
      {
        id: 'actions',
        header: () => <span className="select-none">{t('action')}</span>,
        size: 280,
        cell: (props: CellContext<DevboxListItemTypeV2, unknown>) => (
          <ActionsColumn
            {...props}
            onOpenRelease={handleOpenRelease}
            onGoToTerminal={handleGoToTerminal}
            onStartDevbox={handleStartDevbox}
            onRestartDevbox={handleRestartDevbox}
            onOpenShutdown={handleOpenShutdownModal}
            onDeleteDevbox={handleDeleteDevbox}
          />
        )
      }
    ].filter((column) => {
      if (column.accessorKey === 'gpu' && !sourcePrice.gpu) {
        return false;
      }
      return true;
    }),
    [
      t,
      statusFilter,
      setStatusFilter,
      isSpecificTimeRangeSelected,
      handleEditRemark,
      handleOpenRelease,
      handleGoToTerminal,
      handleStartDevbox,
      handleRestartDevbox,
      handleOpenShutdownModal,
      handleDeleteDevbox,
      sourcePrice.gpu
    ]
  );

  const { startDateTime, endDateTime } = useDateTimeStore();

  const globalFilterFn: FilterFn<DevboxListItemTypeV2> = (row, columnId, filterValue) => {
    const searchTerm = filterValue.toLowerCase();
    const name = row.original.name.toLowerCase();
    const remark = (row.original.remark || '').toLowerCase();
    return name.includes(searchTerm) || remark.includes(searchTerm);
  };

  const columnFilters = useMemo(
    () => [
      { id: 'status', value: statusFilter },
      { id: 'createTime', value: { startDateTime, endDateTime } }
    ],
    [statusFilter, startDateTime, endDateTime]
  );

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
      columnFilters
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
        <div className="flex h-full flex-col gap-3 overflow-x-auto">
          {/* table header */}
          <div className="flex h-10 min-w-[1350px] items-center rounded-lg border-[0.5px] bg-white px-6 py-1 text-sm/5 text-zinc-500 shadow-[0px_2px_8px_-2px_rgba(0,0,0,0.08)]">
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
                className="devboxListItem flex h-16 min-w-[1350px] items-center rounded-xl border-[0.5px] bg-white px-6 shadow-[0px_2px_8px_-2px_rgba(0,0,0,0.08)] transition-colors"
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
      {!!currentDevboxListItem &&
        (currentDevboxListItem.networkType === 'SSHGate' ? (
          <SimpleShutdownDialog
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
        ) : (
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
        ))}
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

export default memo(DevboxList);
