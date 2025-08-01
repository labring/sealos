'use client';

import {
  ArrowBigUpDash,
  Ellipsis,
  IterationCw,
  Pause,
  PencilLine,
  Play,
  SquareTerminal,
  Trash2
} from 'lucide-react';
import dayjs from 'dayjs';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender,
  type ColumnDef
} from '@tanstack/react-table';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useRouter } from '@/i18n';
import { DevboxListItemTypeV2 } from '@/types/devbox';
import { DevboxStatusEnum } from '@/constants/devbox';
import { generateMockMonitorData } from '@/constants/mock';
import { useControlDevbox } from '@/hooks/useControlDevbox';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import IDEButton from '@/components/IDEButton';
import { Button } from '@/components/ui/button';
import MonitorChart from '@/components/MonitorChart';
import DevboxStatusTag from '@/components/StatusTag';
import { Pagination } from '@/components/ui/pagination';
import ReleaseModal from '@/components/dialogs/ReleaseDialog';
import ShutdownModal from '@/components/dialogs/ShutdownDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const DeleteDevboxModal = dynamic(() => import('@/components/dialogs/DeleteDevboxDialog'));

const PAGE_SIZE = 10;

const DevboxList = ({
  devboxList = [],
  refetchDevboxList
}: {
  devboxList: DevboxListItemTypeV2[];
  refetchDevboxList: () => void;
}) => {
  const router = useRouter();
  const t = useTranslations();
  const { handleRestartDevbox, handleStartDevbox, handleGoToTerminal } =
    useControlDevbox(refetchDevboxList);

  const [onOpenRelease, setOnOpenRelease] = useState(false);
  const [onOpenShutdown, setOnOpenShutdown] = useState(false);
  const [delDevbox, setDelDevbox] = useState<DevboxListItemTypeV2 | null>(null);
  const [currentDevboxListItem, setCurrentDevboxListItem] = useState<DevboxListItemTypeV2 | null>(
    null
  );

  const handleOpenRelease = useCallback((devbox: DevboxListItemTypeV2) => {
    setCurrentDevboxListItem(devbox);
    setOnOpenRelease(true);
  }, []);

  const columns = useMemo<ColumnDef<DevboxListItemTypeV2>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('name'),
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex min-w-fit cursor-pointer items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border-[0.5px] border-zinc-200 bg-zinc-50">
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
                  <span className="max-w-20 truncate text-sm font-medium">{item.name}</span>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" sideOffset={1} className="max-w-40">
                  <span className="text-sm break-words">{item.name}</span>
                </TooltipContent>
              </Tooltip>
            </div>
          );
        }
      },
      {
        accessorKey: 'status',
        header: t('status'),
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
        header: t('cpu'),
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
        header: t('memory'),
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
        header: t('create_time'),
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
        header: t('action'),
        size: 270,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center justify-start gap-2">
              <IDEButton
                devboxName={item.name}
                sshPort={item.sshPort}
                status={item.status}
                runtimeType={item.template.templateRepository.iconId as string}
              />
              <Button
                variant="secondary"
                onClick={() => router.push(`/devbox/detail/${item.name}`)}
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
    []
  );

  const table = useReactTable({
    data: devboxList,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: PAGE_SIZE
      }
    },
    // NOTE: this option may cause some bug,but the probability is very small,maybe we should test it carefully.
    autoResetPageIndex: false
  });

  return (
    <>
      {/* table */}
      <div className="flex h-full w-full flex-col justify-between">
        <div className="flex flex-col gap-3">
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
          {table.getRowModel().rows.map((row) => (
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
          ))}
        </div>
        {/* pagination */}
        <Pagination
          currentPage={table.getState().pagination.pageIndex + 1}
          totalPages={table.getPageCount()}
          pageSize={table.getState().pagination.pageSize}
          totalItems={devboxList.length}
          onPageChange={(page) => table.setPageIndex(page - 1)}
        />
      </div>

      {/* dialogs */}
      {!!delDevbox && (
        <DeleteDevboxModal
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
    </>
  );
};

export default DevboxList;
