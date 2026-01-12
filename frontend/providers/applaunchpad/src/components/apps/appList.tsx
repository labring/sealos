import { pauseAppByName, restartAppByName, startAppByName, setAppRemark } from '@/api/app';
import { useAppOperation } from '@/hooks/useAppOperation';
import { useGlobalStore } from '@/store/global';
import { useUserStore } from '@/store/user';
import { AppListItemType } from '@/types/app';
import { getErrText } from '@/utils/tools';
import { toast } from 'sonner';
import { Button } from '@sealos/shadcn-ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@sealos/shadcn-ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@sealos/shadcn-ui/alert-dialog';
import { Input } from '@sealos/shadcn-ui/input';
import { Label } from '@sealos/shadcn-ui/label';
import { Pagination } from '@sealos/shadcn-ui/pagination';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useState, useMemo, memo } from 'react';
import UpdateModal from '@/components/app/detail/index/UpdateModal';
import { useGuideStore } from '@/store/guide';
import { applistDriverObj, startDriver } from '@/hooks/driver';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { BookOpen, Plus, TriangleAlert } from 'lucide-react';
import { track } from '@sealos/gtm';
import { useQuotaGuarded } from '@sealos/shared';
import Empty from './empty';

import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender,
  type ColumnDef
} from '@tanstack/react-table';

import { Name as NameColumn } from './list/columns/Name';
import { Status as StatusColumn } from './list/columns/Status';
import { CreateTime as CreateTimeColumn } from './list/columns/CreateTime';
import { CPU as CPUColumn } from './list/columns/CPU';
import { Memory as MemoryColumn } from './list/columns/Memory';
import { GPU as GPUColumn } from './list/columns/GPU';
import { Replicas as ReplicasColumn } from './list/columns/Replicas';
import { Storage as StorageColumn } from './list/columns/Storage';
import { Actions as ActionsColumn } from './list/columns/Actions';

// Define table meta type for callbacks
export interface AppTableMeta {
  onEditRemark: (appName: string) => void;
  onPauseApp: (appName: string) => void;
  onStartApp: (appName: string) => void;
  onRestartApp: (appName: string) => void;
  onDeleteApp: (appName: string) => void;
  onUpdateApp: (item: AppListItemType) => void;
}

const DelModal = dynamic(() => import('@/components/app/detail/index/DelModal'));
const ErrorModal = dynamic(() => import('@/components/ErrorModal'));

const PAGE_SIZE = 10;

const AppList = ({
  apps = [],
  refetchApps
}: {
  apps: AppListItemType[];
  refetchApps: () => void;
}) => {
  const { t } = useTranslation();
  const { setLoading } = useGlobalStore();
  const { userSourcePrice } = useUserStore();
  const { executeOperation, errorModalState, closeErrorModal } = useAppOperation();
  const router = useRouter();
  const [delAppName, setDelAppName] = useState('');
  const [updateAppName, setUpdateAppName] = useState('');
  const [remarkAppName, setRemarkAppName] = useState('');
  const [remarkValue, setRemarkValue] = useState('');

  // Pause confirm dialog state
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [pendingPauseAppName, setPendingPauseAppName] = useState('');

  // Update modal state (replaces useDisclosure)
  const [isOpenUpdateModal, setIsOpenUpdateModal] = useState(false);
  const onOpenUpdateModal = useCallback(() => setIsOpenUpdateModal(true), []);
  const onCloseUpdateModal = useCallback(() => setIsOpenUpdateModal(false), []);

  const [isOpenRemarkModal, setIsOpenRemarkModal] = useState(false);

  const handleOpenRemarkModal = useCallback(
    (appName: string) => {
      const app = apps.find((app) => app.name === appName);
      setRemarkAppName(appName);
      setRemarkValue(app?.remark || '');
      setIsOpenRemarkModal(true);
    },
    [apps]
  );

  const handleSaveRemark = useCallback(async () => {
    try {
      setLoading(true);
      const app = apps.find((app) => app.name === remarkAppName);
      const kind = app?.kind || 'deployment';

      await setAppRemark({
        appName: remarkAppName,
        remark: remarkValue,
        kind
      });

      toast.success(t('remark_updated_successfully'));

      refetchApps();
    } catch (error: any) {
      toast.error(t(getErrText(error), 'update_remark_failed'));
      console.error(error);
    } finally {
      setLoading(false);
      setIsOpenRemarkModal(false);
      setRemarkAppName('');
      setRemarkValue('');
    }
  }, [apps, remarkAppName, remarkValue, setLoading, t, refetchApps]);

  const handleGotoDocs = useCallback(() => {
    // TODO: update localized docs url?
    const docsUrl =
      router.locale === 'zh'
        ? 'https://sealos.run/docs/guides/app-launchpad'
        : 'https://sealos.run/docs/guides/app-launchpad';
    window.open(docsUrl, '_blank');
  }, [router.locale]);

  const handleCreateApp = useQuotaGuarded(
    {
      requirements: {
        cpu: 1,
        memory: 1,
        nodeport: 1,
        storage: 1,
        traffic: true
      },
      immediate: false,
      allowContinue: true
    },
    () => {
      track('deployment_start', {
        module: 'applaunchpad'
      });
      router.push('/app/edit');
    }
  );

  const handleRestartApp = useCallback(
    async (appName: string) => {
      await executeOperation(() => restartAppByName(appName), {
        successMessage: t('Restart Success'),
        errorMessage: t('Restart Failed'),
        onSuccess: () => refetchApps()
      });
    },
    [executeOperation, refetchApps, t]
  );

  const handlePauseApp = useCallback(
    async (appName: string) => {
      await executeOperation(() => pauseAppByName(appName), {
        successMessage: t('Application paused'),
        errorMessage: t('Application failed'),
        onSuccess: () => refetchApps()
      });
    },
    [executeOperation, refetchApps, t]
  );

  const handleStartApp = useCallback(
    async (appName: string) => {
      await executeOperation(() => startAppByName(appName), {
        successMessage: t('Start Successful'),
        errorMessage: t('Start Failed'),
        onSuccess: () => refetchApps()
      });
    },
    [executeOperation, refetchApps, t]
  );

  const handleUpdateApp = useCallback(
    (item: AppListItemType) => {
      if (item.source.hasSource && item.source.sourceType === 'sealaf') {
        setUpdateAppName(item.name);
        onOpenUpdateModal();
      } else {
        router.push(`/app/edit?name=${item.name}`);
      }
    },
    [onOpenUpdateModal, router]
  );

  const handleDeleteApp = useCallback((appName: string) => {
    setDelAppName(appName);
  }, []);

  const showGpu = !!userSourcePrice?.gpu;

  const handlePauseAppWithDialog = useCallback((appName: string) => {
    setPendingPauseAppName(appName);
    setPauseDialogOpen(true);
  }, []);

  // Stable columns definition - no inline functions for cell renderers
  const columns = useMemo<ColumnDef<AppListItemType>[]>(
    () =>
      [
        {
          accessorKey: 'name',
          header: () => <span className="select-none">{t('Name')}</span>,
          cell: NameColumn
        },
        {
          accessorKey: 'status',
          header: () => <span className="select-none">{t('Status')}</span>,
          size: 140,
          cell: StatusColumn
        },
        {
          accessorKey: 'cpu',
          header: () => <span className="select-none">{t('CPU')}</span>,
          cell: CPUColumn
        },
        {
          accessorKey: 'memory',
          header: () => <span className="select-none">{t('Memory')}</span>,
          cell: MemoryColumn
        },
        {
          accessorKey: 'gpu',
          header: () => <span className="select-none">{t('GPU')}</span>,
          size: 100,
          cell: GPUColumn
        },
        {
          accessorKey: 'replicas',
          header: () => <span className="select-none">{t('Replicas')}</span>,
          size: 120,
          cell: ReplicasColumn
        },
        {
          accessorKey: 'storage',
          header: () => <span className="select-none">{t('Storage')}</span>,
          size: 100,
          cell: StorageColumn
        },
        {
          accessorKey: 'createTime',
          header: () => <span className="select-none">{t('Creation Time')}</span>,
          size: 160,
          cell: CreateTimeColumn
        },
        {
          id: 'actions',
          header: () => <span className="select-none">{t('Operation')}</span>,
          size: 140,
          cell: ActionsColumn
        }
      ].filter((column) => {
        if (column.accessorKey === 'gpu' && !showGpu) {
          return false;
        }
        return true;
      }),
    [t, showGpu]
  );

  // Table meta with callbacks - passed to cells via table.options.meta
  const tableMeta = useMemo<AppTableMeta>(
    () => ({
      onEditRemark: handleOpenRemarkModal,
      onPauseApp: handlePauseAppWithDialog,
      onStartApp: handleStartApp,
      onRestartApp: handleRestartApp,
      onDeleteApp: handleDeleteApp,
      onUpdateApp: handleUpdateApp
    }),
    [
      handleOpenRemarkModal,
      handlePauseAppWithDialog,
      handleStartApp,
      handleRestartApp,
      handleDeleteApp,
      handleUpdateApp
    ]
  );

  const table = useReactTable({
    data: apps,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: PAGE_SIZE
      }
    },
    autoResetPageIndex: false,
    meta: tableMeta
  });

  const { listCompleted } = useGuideStore();
  const isClientSide = useClientSideValue(true);

  useEffect(() => {
    if (!listCompleted && isClientSide) {
      startDriver(
        applistDriverObj(t, () => {
          router.push('/app/edit');
        })
      );
    }
  }, [listCompleted, router, t, isClientSide]);

  return (
    <div className="flex h-screen flex-col bg-zinc-50 px-12">
      {/* Header */}
      <div className="flex h-24 items-center">
        <div className="text-2xl font-semibold text-neutral-950">{t('Applications')}</div>
        <div className="text-base font-medium leading-none ml-2 text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full border-[0.5px] border-zinc-200">
          {apps.length}
        </div>
        <div
          className="flex cursor-pointer items-center gap-2 text-blue-600 ml-4"
          onClick={handleGotoDocs}
        >
          <BookOpen className="h-4 w-4" />
          <span className="text-small font-medium leading-none">{t('docs')}</span>
        </div>
        <div className="flex-1"></div>
        <Button
          className="bg-neutral-950 text-primary-foreground !px-4 rounded-lg h-10 shadow-none"
          onClick={handleCreateApp}
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium leading-none">{t('Create Application')}</span>
        </Button>
      </div>

      {/* Table */}
      <div className="flex flex-1 flex-col justify-between overflow-hidden">
        {apps.length === 0 ? (
          <Empty onCreateApp={handleCreateApp} />
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto scrollbar-hide">
              {/* Table Header */}
              <div className="sticky top-0 z-10 flex min-w-[1350px] h-10 shrink-0 items-center text-sm rounded-lg border-[0.5px] bg-white px-6 text-sm text-zinc-500 shadow-[0px_2px_8px_-2px_rgba(0,0,0,0.08)]">
                {table.getFlatHeaders().map((header) => {
                  const isGrowColumn = ['name', 'cpu', 'memory'].includes(header.id);
                  const columnSize = header.column.columnDef.size;
                  return (
                    <div
                      key={header.id}
                      style={columnSize ? { width: columnSize } : undefined}
                      className={isGrowColumn ? 'shrink-0 grow' : 'shrink-0'}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  );
                })}
              </div>

              {/* Table Body */}
              {table.getRowModel().rows.map((row) => (
                <div
                  key={row.id}
                  className="appListItem group flex h-18 shrink-0 text-sm min-w-[1350px] items-center rounded-xl border-[0.5px] bg-white px-6 shadow-[0px_2px_8px_-2px_rgba(0,0,0,0.08)] transition-colors hover:bg-zinc-50"
                  data-id={row.original.id}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isGrowColumn = ['name', 'cpu', 'memory'].includes(cell.column.id);
                    const columnSize = cell.column.columnDef.size;
                    return (
                      <div
                        key={cell.id}
                        style={columnSize ? { width: columnSize } : undefined}
                        className={`${
                          isGrowColumn ? 'shrink-0 grow' : 'shrink-0'
                        } first:h-full first:flex first:items-center`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between gap-2.5 py-4 text-sm/5 text-zinc-500">
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
          </>
        )}
      </div>

      {/* Modals */}
      {/* Pause Confirm Dialog */}
      <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
        <DialogContent className="w-[360px] text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold leading-none">
              <TriangleAlert className="h-4 w-4 text-yellow-600" />
              {t('Warning')}
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm font-normal">{t('pause_message')}</div>
          <DialogFooter>
            <Button
              variant="outline"
              size="lg"
              className="shadow-none"
              onClick={() => setPauseDialogOpen(false)}
            >
              {t('Cancel')}
            </Button>
            <Button
              size="lg"
              className="shadow-none"
              onClick={() => {
                handlePauseApp(pendingPauseAppName);
                setPauseDialogOpen(false);
                setPendingPauseAppName('');
              }}
            >
              {t('Yes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {!!delAppName && (
        <DelModal
          appName={delAppName}
          source={apps.find((item) => item.name === delAppName)?.source}
          onClose={() => setDelAppName('')}
          onSuccess={refetchApps}
        />
      )}
      <UpdateModal
        source={apps.find((i) => i.name === updateAppName)?.source}
        isOpen={isOpenUpdateModal}
        onClose={() => {
          setUpdateAppName('');
          onCloseUpdateModal();
        }}
      />
      <Dialog open={isOpenRemarkModal} onOpenChange={setIsOpenRemarkModal}>
        <DialogContent className="w-[450px]">
          <DialogHeader>
            <DialogTitle>{t('set_remarks_title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t('remarks')}</Label>
            <Input
              placeholder={t('set_remarks_placeholder')}
              value={remarkValue}
              onChange={(e) => setRemarkValue(e.target.value)}
              maxLength={60}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="shadow-none"
              onClick={() => setIsOpenRemarkModal(false)}
            >
              {t('Cancel')}
            </Button>
            <Button className="shadow-none" onClick={handleSaveRemark}>
              {t('Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {errorModalState.visible && (
        <ErrorModal
          title={errorModalState.title}
          content={errorModalState.content}
          errorCode={errorModalState.errorCode}
          onClose={closeErrorModal}
        />
      )}
    </div>
  );
};

export default React.memo(AppList);
